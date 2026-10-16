'use strict';
// RoboForge Studio: backward-compatible API. Localhost bind by default.
const http = require('node:http');
// Load explicit local configuration; never include .env in release artifacts.
try { if(typeof process.loadEnvFile==='function') process.loadEnvFile(require('node:path').resolve(__dirname,'../.env')); } catch(e) { if(e.code!=='ENOENT') console.error('Invalid .env:',e.message); }
const {URL} = require('node:url');
const {detectTechnologies} = require('./detector');
const {generate} = require('./llm/router');
const {extractFiles, redactError} = require('./utils');
const {PLUGINS} = require('./plugins');
const {opcua} = require('./adapters/opcua');
const {inspect} = require('./adapters/siemens');
const rea = require('./adapters/rea');
const gateway = require('./mcp/gateway');
const refract = require('./adapters/refract');
const janus = require('./adapters/janus');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const APP_VERSION = require('../package.json').version;
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 3001);
const MAX_BODY = 32768;
const CLIENT_DIR = path.resolve(__dirname, '../frontend/dist');
function reply(res, code, data) {
  const payload = Buffer.from(JSON.stringify(data));
  res.writeHead(code, {'Content-Type':'application/json; charset=utf-8','Content-Length':payload.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"});
  res.end(payload);
}
function fail(res, status, message) { reply(res,status,{error:message}); }
async function readJson(req) {
  if (!['application/json','application/json; charset=utf-8'].includes((req.headers['content-type']||'').toLowerCase())) throw Object.assign(new Error('JSON Content-Type required'),{status:415});
  let count=0, chunks=[];
  for await (const chunk of req) {count+=chunk.length; if(count>MAX_BODY) throw Object.assign(new Error('Request exceeds 32 KiB'),{status:413});chunks.push(chunk);}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw Object.assign(new Error('Invalid JSON'),{status:400});}
}
function localOrigin(req) {
  const origin=req.headers.origin;
  if(!origin)return true; // Non-browser CLI apps do not send Origin.
  const allowed=(process.env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean);
  try{
    const o=new URL(origin);
    if(!['http:','https:'].includes(o.protocol))return false;
    const requestHost=req.headers.host;
    if(o.host===requestHost)return true;
    if((o.hostname==='localhost'||o.hostname==='127.0.0.1') && (o.port==='3000'||o.port==='3001'))return true;
    return allowed.includes(o.origin);
  }catch{return false;}
}

function serveStatic(req,res,url) {
  if (!fs.existsSync(CLIENT_DIR)) { return fail(res,503,'Frontend not built. Run npm install && npm run build in frontend, or use the development server.'); }
  const rel=url.pathname==='/'?'index.html':url.pathname.slice(1);
  const target=path.resolve(CLIENT_DIR,rel);
  if (target!==CLIENT_DIR && !target.startsWith(CLIENT_DIR+path.sep)) return fail(res,403,'Forbidden');
  let file=target;
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) file=path.join(CLIENT_DIR,'index.html');
  if (rel.includes('.') && file.endsWith('/index.html') && rel!=='index.html') return fail(res,404,'Not found');
  const ext=path.extname(file);
  const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon'};
  res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream','Cache-Control':ext==='.html'?'no-store':'public, max-age=3600','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws: wss: http://127.0.0.1:* http://localhost:* https:; base-uri 'self'; object-src 'none'; frame-ancestors 'none'"});
  fs.createReadStream(file).pipe(res);
}
const server=http.createServer(async(req,res)=>{
  try {
    if(req.headers.origin&&localOrigin(req)) {
      res.setHeader('Access-Control-Allow-Origin',req.headers.origin);
      res.setHeader('Vary','Origin');
    }
    if(req.method==='OPTIONS') {
      if(!localOrigin(req))return fail(res,403,'Origin not allowed');
      res.writeHead(204,{'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'});return res.end();
    }
    const url=new URL(req.url||'/', 'http://127.0.0.1');
    const p=url.pathname;
    // MCP is a separate, opt-in boundary; never share browser REST permissions.
    if (p==='/mcp') return gateway.handleHttp(req,res);
    // APIs use same-origin requests, even for loopback, to reduce browser-based local exploitation.
    if (p.startsWith('/api/') && !localOrigin(req)) return fail(res,403,'Origin not allowed');
    if(req.method==='GET' && p==='/api/health') return reply(res,200,{ok:true,name:'RoboForge',version:APP_VERSION,status:'running'});
    if(req.method==='GET' && p==='/api/plugins') return reply(res,200,PLUGINS.map(({id,experimental,capabilities,category})=>({id:id==='siemens-xcelerator'?'siemens':id,canonicalId:id,enabled:true,experimental,category,capabilities})));
    if(req.method==='GET' && p==='/api/config') return reply(res,200,{app:'RoboForge',version:APP_VERSION,providers:[{id:'ollama',label:'Local Ollama',configured:true},{id:'openai',label:'OpenAI API',configured:!!process.env.OPENAI_API_KEY},{id:'deepseek',label:'DeepSeek API',configured:!!process.env.DEEPSEEK_API_KEY},{id:'compatible',label:'Compatible API',configured:!!process.env.COMPATIBLE_API_URL}],capabilities:PLUGINS});
    if(req.method==='GET' && p==='/api/mcp/status') return reply(res,200,{enabled:gateway.isEnabled(),transport:'streamable-http',endpoint:gateway.isEnabled()?'http://127.0.0.1:'+req.socket.localPort+'/mcp':null,stateless:true,tools:gateway.TOOL_DEFINITIONS.map(x=>x.name),limits:{tools:gateway.TOOL_DEFINITIONS.length,resultBytes:32768},warning:'Connecting to MCP requires separate ChromaNeural approval; this status is not proof of compatibility.'});
    if(req.method==='GET' && p==='/api/refract/status') return reply(res,200,refract.status());
    if(req.method==='GET' && p==='/api/janus/status') return reply(res,200,janus.status());
    if(req.method==='POST' && p==='/api/refract/compile') {const b=await readJson(req);if(!b||typeof b.source!=='string')return fail(res,400,'CPL source required');return reply(res,200,await refract.compile(b.source));}
    if(req.method==='GET' && p==='/api/rea/status') return reply(res,200,await rea.status());
    if(req.method==='POST' && p==='/api/rea/analyze') return reply(res,200,await rea.analyze(await readJson(req)));
    if(req.method==='POST' && p==='/api/generate') {
      const body=await readJson(req); const prompt=body?.prompt;
      if(typeof prompt!=='string'||prompt.trim().length<3||prompt.length>12000) return fail(res,400,'prompt must have 3–12000 characters');
      const provider=body.provider||'ollama';
      const generated=await generate({prompt:prompt.trim(),provider,model:body.model,apiKey:body.apiKey});
      const files=extractFiles(generated.code);
      return reply(res,200,{technologies:detectTechnologies(prompt),code:generated.code,files:files.map(f=>({path:f.path,lines:f.content.split('\n').length,content:f.content})),integrationGuide:generated.integrationGuide||'Review, test and approve generated code before execution. Never deploy directly to machinery.',provider:generated.provider,model:generated.model});
    }
    if(req.method==='POST' && p==='/api/providers/test') {
      const body=await readJson(req);
      const result=await generate({prompt:'Reply with just the word READY.',provider:body?.provider||'ollama',model:body?.model,apiKey:body?.apiKey,test:true});
      return reply(res,200,{ok:true,provider:result.provider,model:result.model,reply:result.code.slice(0,160)});
    }
    if(req.method==='POST' && p==='/api/opcua/browse') {
      const b=await readJson(req); const results=await opcua('browse',b); return reply(res,200,{nodes:results});
    }
    if(req.method==='POST' && p==='/api/opcua/read') {
      const b=await readJson(req); const result=await opcua('read',b); return reply(res,200,result);
    }
    if(req.method==='POST' && p==='/api/siemens/inspect') return reply(res,200,await inspect(await readJson(req)));
    if(p.startsWith('/api/')) return fail(res,404,'Unknown API');
    if(req.method==='GET'||req.method==='HEAD')return serveStatic(req,res,url);
    return fail(res,405,'Method not allowed');
  } catch(e) {const status=(e.status>=400&&e.status<600)?e.status:502; const msg=redactError(e); if(process.env.NODE_ENV!=='test') console.error('[RoboForge]',status,msg); if(!res.headersSent)fail(res,status,msg);else res.end();}
});
if(require.main===module){if(!Number.isInteger(PORT)||PORT<=0||PORT>65535){console.error('Invalid PORT');process.exit(1);}server.listen(PORT,HOST,()=>console.log(`RoboForge API available at http://${HOST}:${PORT}`));}
module.exports={server, readJson};
