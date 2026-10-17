'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {server}=require('../server');
const gateway=require('../mcp/gateway');
const {PLUGINS}=require('../plugins');
function start(){return new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve('http://127.0.0.1:'+server.address().port)));}
function stop(){return new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
async function rpc(base,id,method,params={},headers={}){
 const r=await fetch(base+'/mcp',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json, text/event-stream',...headers},body:JSON.stringify({jsonrpc:'2.0',id,method,params})});return {status:r.status,body:r.status===202?null:await r.json()};
}
test('10 modules, stable original 8, curated MCP small tool count and safe-only metadata',()=>{
 assert.equal(PLUGINS.length,11);assert.equal(PLUGINS[8].id,'refract');assert.equal(PLUGINS[9].id,'janus');assert.equal(PLUGINS[10].id,'coding-agent');
 assert(gateway.TOOL_DEFINITIONS.length<16);assert(!('enum' in gateway.TOOL_DEFINITIONS[1].inputSchema.properties.module_id),'metadata status schema must remain stable as new plugins are added');assert.deepEqual(gateway.TOOL_DEFINITIONS.map(x=>x.name),['roboforge_catalog_v1','roboforge_module_status_v1','roboforge_refract_compile_cpl_v1']);
 for(const tool of gateway.TOOL_DEFINITIONS){assert.equal(tool.annotations.readOnlyHint,true);assert.equal(tool.annotations.destructiveHint,false);assert.equal(tool.inputSchema.additionalProperties,false);}
});
test('MCP disabled by default and rest API still functional',async()=>{
 delete process.env.ROBOFORGE_MCP_ENABLED;const base=await start();try{
  const r=await rpc(base,1,'tools/list');assert.equal(r.status,404);
  const q=await fetch(base+'/api/health');assert.equal(q.status,200);
  const st=await fetch(base+'/api/mcp/status').then(r=>r.json());assert.equal(st.enabled,false);assert.equal(st.endpoint,null);
 }finally{await stop();}
});
test('MCP handshake, tools/list, module statuses, safe errors and notifications',async()=>{
 process.env.ROBOFORGE_MCP_ENABLED='1';const base=await start();try{
  const init=await rpc(base,11,'initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'fixture',version:'1'}});
  assert.equal(init.status,200);assert.equal(init.body.result.protocolVersion,'2025-06-18');assert(init.body.result.capabilities.tools);
  const old=await rpc(base,12,'initialize',{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'fixture',version:'1'}});assert.equal(old.body.result.protocolVersion,'2025-03-26');
  const newer=await rpc(base,13,'initialize',{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'fixture',version:'1'}});assert.equal(newer.body.result.protocolVersion,'2025-11-25');
  const nope=await rpc(base,14,'initialize',{protocolVersion:'2020-01-01'});assert.equal(nope.body.error.code,-32602);
  const tools=await rpc(base,15,'tools/list');assert.equal(tools.body.result.tools.length,3);
  const all=await rpc(base,16,'tools/call',{name:'roboforge_catalog_v1',arguments:{}});assert.equal(all.body.result.isError,false);assert.equal(JSON.parse(all.body.result.content[0].text).modules.length,11);
  const detail=await rpc(base,17,'tools/call',{name:'roboforge_module_status_v1',arguments:{module_id:'janus'}});assert.equal(detail.body.result.isError,false);assert.match(detail.body.result.content[0].text,/not yet verified/);
  const bad=await rpc(base,18,'tools/call',{name:'roboforge_module_status_v1',arguments:{module_id:'__proto__'}});assert.equal(bad.body.error.code,-32602);
  const dangerous=await rpc(base,19,'tools/call',{name:'run_shell',arguments:{command:'rm -rf /'}});assert.equal(dangerous.body.error.code,-32602);
  const invalid=await rpc(base,20,'tools/call',{name:'roboforge_catalog_v1',arguments:{extra:true}});assert.equal(invalid.body.error.code,-32602);
  const disabled=await rpc(base,21,'tools/call',{name:'roboforge_refract_compile_cpl_v1',arguments:{source:'var x = 1'}});assert.equal(disabled.body.result.isError,true);
  const notification=await fetch(base+'/mcp',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})});assert.equal(notification.status,202);
  const get=await fetch(base+'/mcp');assert.equal(get.status,405);
  const stat=await fetch(base+'/api/mcp/status').then(r=>r.json());assert.equal(stat.enabled,true);assert.equal(stat.tools.length,3);
 }finally{await stop();delete process.env.ROBOFORGE_MCP_ENABLED;}
});
test('MCP denies cross-origin, forged Host, oversized, incorrect protocol and unsafe params',async()=>{
 process.env.ROBOFORGE_MCP_ENABLED='1';const base=await start();try{
  let r=await rpc(base,1,'tools/list',{}, {Origin:'https://attacker.invalid'});assert.equal(r.status,403);
  r=await rpc(base,2,'tools/list',{}, {'Sec-Fetch-Site':'cross-site'});assert.equal(r.status,403);
  r=await rpc(base,3,'tools/list',{}, {'MCP-Protocol-Version':'2000-01-01'});assert.equal(r.status,400);
  r=await rpc(base,4,'tools/call',{name:'roboforge_refract_compile_cpl_v1',arguments:{source:'x'.repeat(5000)}});assert.equal(r.body.error.code,-32602);
  const q=await fetch(base+'/mcp',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json, text/event-stream'},body:'x'.repeat(13000)});assert.equal(q.status,413);
  const wrong=await fetch(base+'/mcp',{method:'POST',headers:{'Content-Type':'text/plain','Accept':'application/json'},body:'{}'});assert.equal(wrong.status,415);
  const wronghost=await new Promise((resolve,reject)=>{const http=require('node:http');const u=new URL(base);const req=http.request({hostname:'127.0.0.1',port:u.port,path:'/mcp',method:'POST',headers:{Host:'attacker.invalid','Content-Type':'application/json','Accept':'application/json'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.end('{}');});assert.equal(wronghost,403);
 }finally{await stop();delete process.env.ROBOFORGE_MCP_ENABLED;}
});
test('Optional Refract adapter calls owner-provided trusted compiler only, with bounded input and no execution',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rf-refract-fixture-'));const pkg=path.join(dir,'refracteditor');fs.mkdirSync(pkg);fs.writeFileSync(path.join(pkg,'__init__.py'),'');fs.writeFileSync(path.join(pkg,'cpl_adapter.py'), 'def compile_cpl(source):\n    return ("MOCK_CPA="+source.strip(), "mock test compiler")\n');
 const before={ref:process.env.REFRACT_ROOT,en:process.env.REFRACT_ENABLED,mcp:process.env.ROBOFORGE_MCP_ENABLED};
 process.env.REFRACT_ROOT=dir;process.env.REFRACT_ENABLED='1';process.env.ROBOFORGE_MCP_ENABLED='1';const base=await start();try{
  const q=await rpc(base,1,'tools/call',{name:'roboforge_refract_compile_cpl_v1',arguments:{source:'var x = 1'}});
  assert.equal(q.status,200);assert.equal(q.body.result.isError,false);const data=JSON.parse(q.body.result.content[0].text);assert.equal(data.cpa,'MOCK_CPA=var x = 1');assert.equal(data.verified,false);
 }finally{await stop();fs.rmSync(dir,{recursive:true,force:true}); for (const [k,v] of [['REFRACT_ROOT',before.ref],['REFRACT_ENABLED',before.en],['ROBOFORGE_MCP_ENABLED',before.mcp]]) {if(v===undefined)delete process.env[k];else process.env[k]=v;}}
});
