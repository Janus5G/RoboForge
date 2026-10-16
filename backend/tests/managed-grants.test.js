'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const os=require('node:os'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {server}=require('../server');
const gateway=require('../mcp/gateway');
const refract=require('../adapters/refract');
const grants=require('../mcp/managed-grants');
let seq=0;
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'rf-managed-v1-'));
 const journal=path.join(root,'journal');fs.mkdirSync(journal,{mode:0o700});
 const pair=crypto.generateKeyPairSync('ed25519');
 const pem=path.join(root,'public.pem');fs.writeFileSync(pem,pair.publicKey.export({type:'spki',format:'pem'}));
 const verifier=new grants.GrantVerifier({publicKeyFile:pem,sessionId:'fixed-session-01',journalDir:journal});
 return {root,journal,pem,pair,verifier,dispose:()=>fs.rmSync(root,{recursive:true,force:true})};
}
function signed(f,tool,args,patch={},now=Date.now()){
 const payload={schemaVersion:1,issuer:'ChromaNeural',audience:'RoboForge',sessionId:'fixed-session-01',authorizationId:'auth-'+(++seq),reservationId:'reservation-'+seq,tool,argumentsSha256:grants.digestArgs(args),issuedAtMs:now-1000,expiresAtMs:now+15000,nonce:crypto.randomBytes(24).toString('base64url'),...patch};
 const message=Buffer.concat([grants.DOMAIN,Buffer.from(grants.canonicalJson(payload))]);
 return {keyId:f.verifier.keyId,payload,signature:crypto.sign(null,message,f.pair.privateKey).toString('base64url')};
}
const tool='roboforge_refract_compile_cpl_v1',args={source:'var x = 1'};
function configureManaged(f){
 Object.assign(process.env,{ROBOFORGE_MCP_ENABLED:'1',ROBOFORGE_CHROMANEURAL_MANAGED:'1',ROBOFORGE_CHROMANEURAL_PUBLIC_KEY_FILE:f.pem,ROBOFORGE_CHROMANEURAL_SESSION_ID:'fixed-session-01',ROBOFORGE_GRANT_STATE_DIR:f.journal});
}
function resetEnv(){for(const name of ['ROBOFORGE_MCP_ENABLED','ROBOFORGE_CHROMANEURAL_MANAGED','ROBOFORGE_CHROMANEURAL_PUBLIC_KEY_FILE','ROBOFORGE_CHROMANEURAL_SESSION_ID','ROBOFORGE_GRANT_STATE_DIR'])delete process.env[name];}
async function start(){return new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve('http://127.0.0.1:'+server.address().port)));}
async function stop(){return new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
async function rpc(base,id,method,params={}){const r=await fetch(base+'/mcp',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id,method,params})});return {status:r.status,body:await r.json()};}
const call=(name,arguments_,envelope)=>({name,arguments:arguments_,...(envelope===undefined?{}:{_meta:{[grants.META_KEY]:envelope}})});

test('Python-compatible JSON canonicalization vectors with Unicode and deeply nested order',()=>{
 const vectors=[
  [{},'44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a'],
  [{source:'Hej København — æøå 😀'},'5b8bf5d0137e6b1d13d54561cd5a184873ede0bc10fe19f09e0f9a01e6606ae7'],
  [{z:[true,3,{k:'værdi'}],a:false},'a4532b493ebc67117718d2483224a78acdf058abf89fd805286513a660dcb21e'],
  [{nums:[0,13,9007199254740991],nested:{æ:'blå',Z:'x'}},'cc7118bc8556ee7787198f165907895bafdd43d05f6e8aff22f843fff3b3ef24'],
  [{slash:'a/b',ctrl:'line\nnext'},'5202319b9789f125375a5f9acb37244a6b050299fc033019ce2f94567986d5ef']
 ];
 for(const [input,hash] of vectors)assert.equal(grants.digestArgs(input),hash);
 assert.throws(()=>grants.canonicalJson({ratio:0.75}),/Unsupported/);
 assert.throws(()=>grants.canonicalJson({unsafe:9007199254740992}),/Unsupported/);
 assert.throws(()=>grants.canonicalJson({a:'\ud800'}),/surrogate/);
});

test('Ed25519 grant signature and scope enforced, replay journal durable across verifier restarts',()=>{
 const f=fixture();try{
   const good=signed(f,tool,args);const record=f.verifier.validate(good,tool,args);f.verifier.consume(record);
   assert.throws(()=>f.verifier.consume(record));
   const v2=new grants.GrantVerifier({publicKeyFile:f.pem,sessionId:'fixed-session-01',journalDir:f.journal});
   assert.throws(()=>v2.consume(v2.validate(good,tool,args)));
   const forged={...good,signature:crypto.randomBytes(64).toString('base64url')};assert.throws(()=>f.verifier.validate(forged,tool,args));
   const wrongTool=signed(f,tool,args);assert.throws(()=>f.verifier.validate(wrongTool,'roboforge_catalog_v1',{}));
   assert.throws(()=>f.verifier.validate(good,tool,{source:'var x = 999'}));
   for(const patch of [{issuer:'Other'},{audience:'Other'},{sessionId:'other-session'},{schemaVersion:2},{usageUnits:2},{issuedAtMs:Date.now()+7000},{expiresAtMs:Date.now()-1000},{expiresAtMs:Date.now()+60000}]){
     const x=signed(f,tool,args,patch); assert.throws(()=>f.verifier.validate(x,tool,args),JSON.stringify(patch));
   }
   const badKey=signed(f,tool,args);badKey.keyId='f'.repeat(64);assert.throws(()=>f.verifier.validate(badKey,tool,args));
   const pair2=crypto.generateKeyPairSync('ed25519');const altered=signed(f,tool,args);altered.signature=crypto.sign(null,Buffer.concat([grants.DOMAIN,Buffer.from(grants.canonicalJson(altered.payload))]),pair2.privateKey).toString('base64url');assert.throws(()=>f.verifier.validate(altered,tool,args));
 }finally{f.dispose();}
});

test('Untrusted/symlink replay directory fails closed; no private key present in app',()=>{
 const f=fixture();try{
   const symlink=path.join(f.root,'redirect');fs.symlinkSync(f.journal,symlink);
   assert.throws(()=>new grants.GrantVerifier({publicKeyFile:f.pem,sessionId:'fixed-session-01',journalDir:symlink}),/Symlink/);
   const x=path.join(f.root,'not-private');fs.mkdirSync(x,{mode:0o755});fs.chmodSync(x,0o755);
   assert.throws(()=>new grants.GrantVerifier({publicKeyFile:f.pem,sessionId:'fixed-session-01',journalDir:x}),/private/);
   const bad=path.join(f.root,'tamper');fs.mkdirSync(bad,{mode:0o700});fs.writeFileSync(path.join(bad,'garbage'), 'bad');
   assert.throws(()=>new grants.GrantVerifier({publicKeyFile:f.pem,sessionId:'fixed-session-01',journalDir:bad}),/Unexpected/);
   assert(!fs.readdirSync(f.journal).includes('private.key'));
 }finally{f.dispose();}
});

test('Managed MCP: metadata is free; controlled calls require grants; REST bypass blocked; standalone survives',async()=>{
 const f=fixture();const original=refract.compile;let count=0;
 refract.compile=async src=>{count++;return {cpa:'MOCK='+src,verified:false};};
 configureManaged(f);
 const base=await start();try{
   const init=await rpc(base,1,'initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'test',version:'1'}});assert.equal(init.status,200);
   const listed=await rpc(base,2,'tools/list');assert.equal(listed.body.result.tools.length,3);
   assert.deepEqual(listed.body.result.tools,gateway.TOOL_DEFINITIONS);
   assert.equal((await rpc(base,3,'tools/call',call('roboforge_catalog_v1',{}))).body.result.isError,false);
   assert.equal((await rpc(base,4,'tools/call',call('roboforge_module_status_v1',{module_id:'janus'}))).body.result.isError,false);
   assert.equal((await rpc(base,5,'tools/call',call(tool,args))).body.error.code,-32001);assert.equal(count,0);
   let v=signed(f,tool,args);v.signature='incorrect';assert.equal((await rpc(base,6,'tools/call',call(tool,args,v))).body.error.code,-32001);assert.equal(count,0);
   const good=signed(f,tool,args);const accepted=await rpc(base,7,'tools/call',call(tool,args,good));
   assert.equal(accepted.body.result.isError,false);assert.equal(count,1);
   assert.deepEqual(accepted.body.result._meta['net.aagii.chromaneural/authorization-receipt'],{authorizationId:good.payload.authorizationId,reservationId:good.payload.reservationId,authorizationAccepted:true,tool});
   assert.equal((await rpc(base,8,'tools/call',call(tool,args,good))).body.error.code,-32001);assert.equal(count,1);
   assert.equal((await rpc(base,9,'tools/call',call(tool,{source:'changed'},signed(f,tool,args)))).body.error.code,-32001);assert.equal(count,1);
   for(const route of ['/api/generate','/api/providers/test','/api/opcua/browse','/api/opcua/read','/api/rea/analyze','/api/refract/compile','/api/siemens/inspect']){
     const res=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(res.status,403,route);
   }
   assert.equal((await fetch(base+'/api/health')).status,200);
   assert.equal((await fetch(base+'/api/mcp/status')).status,200);
   assert.equal((await fetch(base+'/')).status,403);
   const stat=await fetch(base+'/api/mcp/status').then(r=>r.json());assert.equal(stat.managedMode,true);
   delete process.env.ROBOFORGE_CHROMANEURAL_MANAGED;
   const standalone=await rpc(base,10,'tools/call',call(tool,args));assert.equal(standalone.body.result.isError,false);assert.equal(count,2);
   // CI builds the frontend before backend tests, while local source checkouts may not.
   // Standalone mode must serve the UI when built and report 503 only when absent.
   const frontendIndex=path.resolve(__dirname,'../../frontend/dist/index.html');
   const response=await fetch(base+'/');
   if(fs.existsSync(frontendIndex)) {
     assert.equal(response.status,200);
     assert.match(response.headers.get('content-type')||'',/^text\/html\b/i);
   } else {
     assert.equal(response.status,503);
   }
 }finally{await stop();refract.compile=original;resetEnv();f.dispose();}
});

test('Managed MCP: adapter failure consumes grant and returns correlation for ChromaNeural',async()=>{
 const f=fixture();configureManaged(f);const original=refract.compile;let count=0;
 refract.compile=async()=>{count++;throw new Error('Synthetic adapter failure');};
 const base=await start();try{
   const good=signed(f,tool,args);const res=await rpc(base,11,'tools/call',call(tool,args,good));
   assert.equal(res.body.result.isError,true);assert.equal(res.body.result._meta['net.aagii.chromaneural/authorization-receipt'].authorizationAccepted,true);
   assert.equal(count,1);const again=await rpc(base,12,'tools/call',call(tool,args,good));assert.equal(again.body.error.code,-32001);assert.equal(count,1);
 }finally{await stop();refract.compile=original;resetEnv();f.dispose();}
});

test('Missing verifier config blocks dispatch while protocol discovery remains available',async()=>{
 delete process.env.ROBOFORGE_CHROMANEURAL_PUBLIC_KEY_FILE;delete process.env.ROBOFORGE_GRANT_STATE_DIR;
 process.env.ROBOFORGE_CHROMANEURAL_MANAGED='1';process.env.ROBOFORGE_MCP_ENABLED='1';
 const base=await start();try{
  assert.equal((await rpc(base,1,'tools/list')).body.result.tools.length,3);
  assert.equal((await rpc(base,2,'tools/call',call(tool,args))).body.error.code,-32001);
  assert.equal((await rpc(base,3,'tools/call',call('roboforge_catalog_v1',{}))).body.result.isError,false);
 }finally{await stop();resetEnv();}
});

test('Resource grants do not contain units or prices; legacy per-call point token is rejected',()=>{
 const f=fixture();try{
  const g=signed(f,tool,args);
  assert(!Object.hasOwn(g.payload,'usageUnits'));
  assert(!Object.hasOwn(g.payload,'points'));
  assert(!Object.hasOwn(g.payload,'balance'));
  assert(f.verifier.validate(g,tool,args));
  for(const addition of [{usageUnits:1},{price:1},{balance:50},{points:10},{normalization:'one per call'}]){
   assert.throws(()=>f.verifier.validate(signed(f,tool,args,addition),tool,args),/Invalid grant fields/);
  }
 }finally{f.dispose();}
});

test('Resource envelope validates bounded raw technical ceilings and rejects unsupported controls',()=>{
 const f=fixture();try{
  const allowed={maxWallMillis:1200,maxInputBytes:1024,maxOutputBytes:5000};
  const p=f.verifier.validate(signed(f,tool,args,{resourceEnvelope:allowed}),tool,args);
  assert.deepEqual(p.resourceEnvelope,allowed);
  const hard=f.verifier.validate(signed(f,tool,args,{resourceEnvelope:{maxWallMillis:999999,maxOutputBytes:999999,maxInputBytes:999999}}),tool,args);
  assert.deepEqual(hard.resourceEnvelope,{maxWallMillis:5500,maxInputBytes:8192,maxOutputBytes:30000});
  for(const invalid of [{},{maxWallMillis:0},{maxOutputBytes:-1},{maxInputBytes:1.5},{randomField:1},{maxMemoryBytes:1000},{maxCpuMicros:1},{maxProcesses:1},{maxWallMillis:'100'},{maxInputBytes:null}]){
   assert.throws(()=>f.verifier.validate(signed(f,tool,args,{resourceEnvelope:invalid}),tool,args),/resource envelope|ceiling|Unsupported|Resource ceiling/i);
  }
 }finally{f.dispose();}
});

test('Resource envelope is signed and tampering with a ceiling invalidates authorization',()=>{
 const f=fixture();try{
  const g=signed(f,tool,args,{resourceEnvelope:{maxWallMillis:1000}});
  assert(f.verifier.validate(g,tool,args));
  g.payload.resourceEnvelope.maxWallMillis=5000;
  assert.throws(()=>f.verifier.validate(g,tool,args),/signature/);
 }finally{f.dispose();}
});

test('Over-limit input rejected before consuming grant or invoking adapter',async()=>{
 const f=fixture();configureManaged(f);const prior=refract.compile;let n=0;
 refract.compile=async()=>{n++;return {cpa:'fake'}};
 const base=await start();try{
  const g=signed(f,tool,args,{resourceEnvelope:{maxInputBytes:5}});
  const r=await rpc(base,60,'tools/call',call(tool,args,g));
  assert.equal(r.body.error.code,-32001);assert.equal(n,0);
  assert.equal(fs.readdirSync(f.journal).length,0);
 }finally{await stop();refract.compile=prior;resetEnv();f.dispose();}
});

test('Valid bounded grant passes runtime limits to compiler; returns advisory telemetry but no economic value',async()=>{
 const f=fixture();configureManaged(f);const previous=refract.compile;let calls=[];
 refract.compile=async (src,limits)=>{calls.push({src,limits});return {cpa:'CPA',verified:false};};
 const base=await start();try{
  const g=signed(f,tool,args,{resourceEnvelope:{maxWallMillis:450,maxInputBytes:8192,maxOutputBytes:512}});
  const r=await rpc(base,61,'tools/call',call(tool,args,g));
  assert.equal(r.body.result.isError,false);
  assert.equal(calls.length,1);
  assert.equal(calls[0].limits.maxWallMillis,450);
  assert.equal(calls[0].limits.maxOutputBytes,512);
  const meta=r.body.result._meta;
  assert.equal(meta['net.aagii.chromaneural/authorization-receipt'].authorizationAccepted,true);
  const t=meta['net.aagii.chromaneural/execution-telemetry'];
  assert.equal(t.advisoryOnly,true);assert.equal(t.authoritativeForChromaPoints,false);
  assert.deepEqual(t.enforcedCeilings,['maxInputBytes','maxOutputBytes','maxWallMillis']);
  assert.equal(t.state,'completed');
  for(const key of ['points','pointCost','balance','earned','spent','normalizedValue'])assert(!Object.hasOwn(t,key));
 }finally{await stop();refract.compile=previous;resetEnv();f.dispose();}
});

test('Output envelope exhaustion returns error and consumes authorization',async()=>{
 const f=fixture();configureManaged(f);const previous=refract.compile;let calls=0;
 refract.compile=async()=>{calls++;return {cpa:'X'.repeat(1000)}};
 const base=await start();try{
  const g=signed(f,tool,args,{resourceEnvelope:{maxOutputBytes:60}});
  const r=await rpc(base,62,'tools/call',call(tool,args,g));assert.equal(r.body.result.isError,true);
  const t=r.body.result._meta['net.aagii.chromaneural/execution-telemetry'];assert.equal(t.state,'error');assert.equal(t.advisoryOnly,true);
  assert.equal((await rpc(base,63,'tools/call',call(tool,args,g))).body.error.code,-32001);
  assert.equal(calls,1);
 }finally{await stop();refract.compile=previous;resetEnv();f.dispose();}
});

test('Bounded real Refract subprocess timeout consumes authorization before worker dispatch',async()=>{
 const f=fixture();configureManaged(f);
 const root=path.join(f.root,'fake-refract');fs.mkdirSync(root);fs.mkdirSync(path.join(root,'refracteditor'));
 fs.writeFileSync(path.join(root,'refracteditor','cpl_adapter.py'),
  'import time\ndef compile_cpl(source):\n    time.sleep(0.3)\n    return ("FAKE CPA", "test")\n');
 process.env.REFRACT_ENABLED='1';process.env.REFRACT_ROOT=root;process.env.REFRACT_PYTHON='python3';
 const base=await start();try{
  const g=signed(f,tool,args,{resourceEnvelope:{maxWallMillis:50,maxOutputBytes:1024}});
  const r=await rpc(base,65,'tools/call',call(tool,args,g));assert.equal(r.body.result.isError,true);
  assert.match(r.body.result.content[0].text,/timed out/);
  assert.equal((await rpc(base,66,'tools/call',call(tool,args,g))).body.error.code,-32001);
 }finally{await stop();for(const key of ['REFRACT_ENABLED','REFRACT_ROOT','REFRACT_PYTHON'])delete process.env[key];resetEnv();f.dispose();}
});

test('Managed REST REA status never spawns the optional CLI',async()=>{
 const f=fixture();configureManaged(f);
 const rea=require('../adapters/rea');const prior=rea.status;let count=0;
 rea.status=async()=>{count++;throw new Error('REA CLI was unexpectedly invoked')};
 const base=await start();try{
  const res=await fetch(base+'/api/rea/status');assert.equal(res.status,200);
  const b=await res.json();assert.equal(b.externalProbe,false);assert.equal(count,0);
 }finally{await stop();rea.status=prior;resetEnv();f.dispose();}
});

test('Resource envelope with unknown future tool cannot bypass controlled deny-by-default rule',()=>{
 assert.equal(gateway.isControlled('roboforge_future_inference_v5'),true);
 assert.equal(gateway.isControlled('roboforge_refract_compile_cpl_v1'),true);
 assert.equal(gateway.isControlled('roboforge_catalog_v1'),false);
 assert.equal(gateway.isControlled('roboforge_module_status_v1'),false);
});
