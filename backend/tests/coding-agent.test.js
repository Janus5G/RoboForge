'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const agent=require('../adapters/coding-agent');
const {PLUGINS}=require('../plugins');
const {server}=require('../server');
const keys=['CHROMAPLEX_AGENT_ENABLED','CHROMAPLEX_AGENT_ROOT','CHROMAPLEX_AGENT_PYTHON','CHROMAPLEX_AGENT_VERIFY_ROOTS','ROBOFORGE_CHROMANEURAL_MANAGED'];
const before=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
function reset(){for(const k of keys){if(before[k]===undefined)delete process.env[k];else process.env[k]=before[k];}}
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'rf-agent-test-'));
 const pkg=path.join(root,'chromaplex_agent');fs.mkdirSync(pkg);fs.writeFileSync(path.join(pkg,'__init__.py'),'');
 const modules={
 'targets.py':`class T:\n def __init__(self,key): self.key=key;self.family='desktop'\ndef get_target(key):\n if key not in ('linux-desktop','esp32','arduino','raspberry-pi','web-wasm','chromaplex-vm','windows-desktop'): raise ValueError('bad target')\n return T(key)\n`,
 'security.py':`class L:\n value='SAFE'\nclass R:\n level=L();findings=[]\ndef scan_files(files): return R()\n`,
 'memory_safety.py':`class L:\n value='SAFE'\nclass R:\n level=L();findings=[]\ndef scan_memory_safety(files,language,target): return R()\n`,
 'secure_compile.py':`class SecureCompilePolicy:\n def __init__(self,malware_scan_required,allow_reviewed_source,require_memory_safe):\n  if not (malware_scan_required and require_memory_safe and not allow_reviewed_source): raise ValueError('gate bypass')\ndef preflight_sources(files, language, target, policy):\n raise RuntimeError('scanner missing')\ndef verify_security_manifest(binary,manifest): return (True,[])\n`,
 'verify_build.py':'# fixture',
 };
 for(const [name,content] of Object.entries(modules))fs.writeFileSync(path.join(pkg,name),content);
 const binaryDir=path.join(root,'approved');fs.mkdirSync(binaryDir);const artifact=path.join(binaryDir,'program.bin');fs.writeFileSync(artifact,'abc');fs.writeFileSync(artifact+'.security.json','{}');
 return {root,binaryDir,artifact,clean:()=>fs.rmSync(root,{recursive:true,force:true})};
}
async function withServer(callback){await new Promise(r=>server.listen(0,'127.0.0.1',r));try{return await callback('http://127.0.0.1:'+server.address().port);}finally{await new Promise(r=>server.close(r));}}
async function post(base,uri,data){const r=await fetch(base+uri,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});return {status:r.status,body:await r.json()};}
test('11 registered modules; original ten retained; MCP tool contracts remain curated',()=>{
 assert.equal(PLUGINS.length,11);assert.equal(PLUGINS.at(-1).id,'coding-agent');
 assert.deepEqual(PLUGINS.at(-1).capabilities,['source-review','secure-preflight','verify-build']);
 const gateway=require('../mcp/gateway');assert.equal(gateway.TOOL_DEFINITIONS.length,3);
 assert.equal(gateway.isControlled('roboforge_coding_agent_source_review_v1'),true);
});
test('disabled-by-default status and invalid input fail closed without source checkout',async()=>{
 reset();delete process.env.CHROMAPLEX_AGENT_ENABLED;delete process.env.CHROMAPLEX_AGENT_ROOT;
 try{assert.equal(agent.status().enabled,false);assert.equal(agent.status().configured,false);
  await assert.rejects(()=>agent.inspect({target:'linux-desktop',filename:'main.py',language:'Python',source:'print(1)'}),/disabled/);
  await assert.rejects(()=>agent.inspect({target:'linux-desktop',filename:'../secret.py',language:'Python',source:'print(1)'}),/single-file/);
  await assert.rejects(()=>agent.inspect({target:'bogus',filename:'main.py',language:'Python',source:'print(1)'}),/target/);
  await assert.rejects(()=>agent.verify({path:'/tmp/artifact'}),/verification disabled/);
 }finally{reset();}
});
test('Linux subprocess bridge reviews untrusted source; mandatory preflight fails closed',async()=>{
 const f=fixture();try{
  process.env.CHROMAPLEX_AGENT_ENABLED='1';process.env.CHROMAPLEX_AGENT_ROOT=f.root;
  const result=await agent.inspect({target:'linux-desktop',filename:'main.py',language:'Python (Linux)',source:'print("demo")'});
  assert.equal(result.ok,true);assert.equal(result.staticAnalysis.state,'SAFE');assert.equal(result.memorySafety.state,'SAFE');
  assert.equal(result.fullSecureBuildVerified,false);assert.equal(result.binaryReleased,false);
  assert.match(result.notice,/not equivalent/i);
  const gate=await agent.inspect({target:'linux-desktop',filename:'main.py',language:'Python (Linux)',source:'print("demo")',mode:'secure-preflight'});
  assert.equal(gate.ok,false);assert.equal(gate.malwareScan,'NOT PASSED');assert.equal(gate.binaryReleased,false);
  const verified=await assert.rejects(()=>agent.verify({path:f.artifact}),/verification disabled/);void verified;
  process.env.CHROMAPLEX_AGENT_VERIFY_ROOTS=f.binaryDir;
  const verifiedArtifact=await agent.verify({path:f.artifact});assert.equal(verifiedArtifact.verified,true);
  await assert.rejects(()=>agent.verify({path:'/etc/hosts'}),/outside approved/);
 }finally{reset();f.clean();}
});
test('REST integration presents status and maintains managed-mode non-bypass',async()=>{
 const f=fixture();try{
  delete process.env.CHROMAPLEX_AGENT_ENABLED;delete process.env.CHROMAPLEX_AGENT_ROOT;
  await withServer(async base=>{
   const s=await fetch(base+'/api/coding-agent/status').then(r=>r.json());assert.equal(s.enabled,false);
   const denied=await post(base,'/api/coding-agent/review',{source:'print(1)',target:'linux-desktop',filename:'main.py',language:'Python'});assert.equal(denied.status,403);
   process.env.ROBOFORGE_CHROMANEURAL_MANAGED='1';
   for(const route of ['/api/coding-agent/review','/api/coding-agent/preflight','/api/coding-agent/verify']){
    const res=await post(base,route,{});assert.equal(res.status,403,route);
   }
   assert.equal((await fetch(base+'/api/coding-agent/status')).status,200);
  });
 }finally{reset();f.clean();}
});
test('installed Coding Agent SHA-256 seal is checked before Python imports',async()=>{
 const f=fixture();try{
  process.env.CHROMAPLEX_AGENT_ENABLED='1';process.env.CHROMAPLEX_AGENT_ROOT=f.root;
  const member=path.join(f.root,'chromaplex_agent','security.py');
  const bytes=fs.readFileSync(member);const digest=require('node:crypto').createHash('sha256').update(bytes).digest('hex');
  fs.writeFileSync(path.join(f.root,'SHA256SUMS'),digest+'  ./chromaplex_agent/security.py\n');
  assert.deepEqual(agent.verifyInstalledSeal(f.root),{packaged:true,verified:true});
  fs.appendFileSync(member,'#unexpected edit\n');
  assert.throws(()=>agent.verifyInstalledSeal(f.root),/mismatch/);
  await assert.rejects(()=>agent.inspect({target:'linux-desktop',filename:'main.py',language:'Python',source:'print(1)'}),/checksum/);
 }finally{reset();f.clean();}
});
