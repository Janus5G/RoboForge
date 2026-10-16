'use strict';
// Process-level local smoke test: requires a manually enabled RoboForge MCP Gateway.
const assert=require('node:assert/strict');
const endpoint=process.env.ROBOFORGE_MCP_TEST_URL||'http://127.0.0.1:3001/mcp';
async function call(id,method,params){
 const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id,method,params}),signal:AbortSignal.timeout(5000)});
 assert.equal(r.status,200,`HTTP ${r.status} for ${method}`);const body=await r.json();assert.equal(body.jsonrpc,'2.0');assert.equal(body.id,id);assert(!body.error,JSON.stringify(body.error));return body.result;
}
(async()=>{
 const hello=await call(1,'initialize',{protocolVersion:'2025-06-18',clientInfo:{name:'RoboForge smoke test',version:'1'},capabilities:{}});
 assert.equal(hello.protocolVersion,'2025-06-18');
 const tools=await call(2,'tools/list',{});assert.equal(tools.tools.length,3);
 const modules=await call(3,'tools/call',{name:'roboforge_catalog_v1',arguments:{}});assert.equal(JSON.parse(modules.content[0].text).modules.length,10);
 console.log('PASS: streamable HTTP handshake, 3 curated MCP tools, 10 registered modules; no industrial action executed.');
})().catch(e=>{console.error('FAIL:',e.message);process.exitCode=1;});
