'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const http=require('node:http');
const {server}=require('../server');const {extractFiles,safePath,redactError}=require('../utils');const {detectTechnologies}=require('../detector');const {safeBase}=require('../llm/router');const {PLUGINS}=require('../plugins');
async function start(s){await new Promise(r=>s.listen(0,'127.0.0.1',r));return `http://127.0.0.1:${s.address().port}`;}
async function stop(s){await new Promise((r,j)=>s.close(e=>e?j(e):r()));}
async function setup(){const fake=http.createServer(async(req,res)=>{let body='';for await(const c of req)body+=c;let j;try{j=JSON.parse(body);}catch{j={};}if(req.url==='/api/chat'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({message:{content:'FILE: src/demo.py\n```python\nprint("ok")\n```'},model:j.model}));}else if(req.url==='/v1/chat/completions'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{message:{content:'FILE: test.txt\n```text\nhello\n```'}}]}));}else{res.writeHead(404);res.end('{}');}});
const fakeurl=await start(fake);process.env.OLLAMA_URL=fakeurl;process.env.COMPATIBLE_API_URL=fakeurl+'/v1';process.env.COMPATIBLE_API_KEY='not-real-test-key';const base=await start(server);return {fake,base};}
async function post(url,data,headers={}){const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(data)});return {res,json:await res.json()};}
test('original seven plugin IDs and seventeen capabilities retained; REA added independently',()=>{assert.equal(PLUGINS.length,10);assert.deepEqual(PLUGINS.slice(0,7).map(x=>x.id),['ros2','opcua','mqtt','isaac-sim','siemens-xcelerator','arduino','home-assistant']);assert.equal(PLUGINS.slice(0,7).reduce((n,p)=>n+p.capabilities.length,0),17);assert.equal(PLUGINS[7].id,'rea');});
test('technology detection and safety-sensitive path normalization',()=>{assert(detectTechnologies('ROS 2 MQTT bridge').includes('ROS 2'));assert(detectTechnologies('ROS 2 MQTT bridge').includes('MQTT/EMQX'));for(const s of ['../../pass','C:/Windows/file.txt','/root/secret','a/../b','a\\b'])assert.equal(safePath(s),null);assert.equal(safePath('src/robot_node.py'),'src/robot_node.py');});
test('safe generated file parsing ignores traversal and duplicate paths',()=>{const items=extractFiles('FILE: ../evil.txt\n```txt\nevil\n```\nFILE: ok.txt\n```txt\nOK\n```\nFILE: ok.txt\n```txt\nBAD\n```');assert.equal(items.length,1);assert.equal(items[0].content,'OK');});
test('provider guard and log redaction',()=>{assert.throws(()=>safeBase('http://example.com/v1','openai'));assert.match(redactError(new Error('Bearer supersecret')),/REDACTED/);});
test('HTTP application: health, metadata, validation, mock AI providers, integration guards',async()=>{const {fake,base}=await setup();try{
 let r=await fetch(base+'/api/health');assert.equal(r.status,200);let health=await r.json();assert.equal(health.ok,true);assert.equal(health.version,require('../../package.json').version);
 r=await fetch(base+'/api/plugins');assert.equal((await r.json()).length,10);
 r=await fetch(base+'/api/config');const config=await r.json();assert.equal(config.providers.length,4);assert.equal(config.version,require('../../package.json').version);
 let p=await post(base+'/api/generate',{prompt:'x'});assert.equal(p.res.status,400);
 p=await post(base+'/api/generate',{prompt:'Make ROS 2 monitor with MQTT',provider:'ollama'});assert.equal(p.res.status,200);assert.equal(p.json.files[0].path,'src/demo.py');assert.equal(p.json.files[0].lines,1);assert(p.json.technologies.includes('ROS 2'));
 p=await post(base+'/api/generate',{prompt:'Generate an OPC UA read-only test',provider:'compatible'});assert.equal(p.res.status,200);assert.equal(p.json.files[0].path,'test.txt');
 p=await post(base+'/api/generate',{prompt:'Any test',provider:'invalid'});assert.equal(p.res.status,400);
 p=await post(base+'/api/generate',{prompt:'Any test',provider:'ollama'},{Origin:'https://malicious.test'});assert.equal(p.res.status,403);
 p=await post(base+'/api/opcua/browse',{endpoint:'opc.tcp://example.com:4840'});assert.equal(p.res.status,400);
 p=await post(base+'/api/siemens/inspect',{path:'/assets'});assert.equal(p.res.status,503);
 r=await fetch(base+'/api/not-a-real-route');assert.equal(r.status,404);
 }finally{await stop(server);await stop(fake);delete process.env.OLLAMA_URL;delete process.env.COMPATIBLE_API_URL;delete process.env.COMPATIBLE_API_KEY;}});
