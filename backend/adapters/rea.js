'use strict';
// Optional local REA CLI bridge. Does not install packages, load remote code or use a shell.
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
const ACTIONS = Object.freeze({
  javascript: {command:'analyze-javascript-application', label:'JavaScript / Electron (static)', kind:'js'},
  dotnet: {command:'inspect-managed-artifact', label:'.NET assembly metadata', kind:'dotnet'},
  go: {command:'inspect-go-binary', label:'Go build metadata', kind:'file'},
  rust: {command:'inspect-rust-binary', label:'Rust crate metadata', kind:'file'}
});
function err(message, status=400){return Object.assign(new Error(message),{status});}
function authorizedRoots(){
  const raw=(process.env.REA_ALLOWED_ROOTS || '').trim();
  if(!raw)return [];
  return raw.split(path.delimiter).map(s=>s.trim()).filter(Boolean).flatMap(s=>{
    try { if(!path.isAbsolute(s))return [];const p=fs.realpathSync(s); return fs.statSync(p).isDirectory()?[p]:[]; }
    catch{return [];}
  });
}
function enabled(){return process.env.REA_ENABLED==='1' && authorizedRoots().length>0;}
function verifyTarget(target, kind){
  if(typeof target!=='string'||target.length>2048||!path.isAbsolute(target)||target.includes('\0'))throw err('Select an absolute local path, not a URL or relative path.');
  const roots=authorizedRoots();
  if(!roots.length)throw err('No REA_ALLOWED_ROOTS configured on the server.',503);
  let real,stat;
  try {real=fs.realpathSync(target);stat=fs.statSync(real);} catch {throw err('Target not found or inaccessible.',400);}
  if(!roots.some(root=>real!==root && real.startsWith(root+path.sep)))throw err('Target is outside the explicitly authorized REA_ALLOWED_ROOTS.',403);
  if(kind==='js' && !(stat.isDirectory()||(stat.isFile() && real.toLowerCase().endsWith('.asar'))))throw err('JavaScript analysis expects a directory or .asar file.');
  if(kind==='dotnet'&&!(stat.isFile()&&/\.(dll|exe)$/i.test(real)))throw err('Managed artifact analysis expects a .dll or .exe file.');
  if(kind==='file'&&!stat.isFile())throw err('Binary analysis expects a file.');
  return real;
}
function cli(){return process.env.REA_BIN || 'rea';}
function runCli(args,{timeout=90000,outputLimit=4*1024*1024}={}){
 return new Promise((resolve,reject)=>{
  let child,stdout='',stderr='',size=0,done=false;
  function finish(error,data){if(done)return;done=true;clearTimeout(timer);if(error)reject(error);else resolve(data);}
  try { child=spawn(cli(),args,{shell:false,windowsHide:true,stdio:['ignore','pipe','pipe'],env:process.env}); }
  catch {reject(err('Unable to start the REA CLI.',503));return;}
  const timer=setTimeout(()=>{child.kill('SIGKILL');finish(err('REA analysis timed out. CLI subprocess terminated.',504));},timeout);
  child.stdout.on('data',buf=>{size+=buf.length;if(size>outputLimit){child.kill('SIGKILL');finish(err('REA output exceeded the configured safe limit; use REA CLI directly for large Evidence.',413));} else stdout+=buf.toString('utf8');});
  child.stderr.on('data',buf=>{if(stderr.length<4096)stderr+=buf.toString('utf8').slice(0,4096-stderr.length);});
  child.on('error',e=>finish(err(e.code==='ENOENT'?'REA CLI not found. Install rea-agents separately and ensure rea is on PATH.':'REA CLI could not start.',503)));
  child.on('close',code=>{if(code!==0)finish(err(`REA process exited with code ${code}. Check your REA CLI setup and target prerequisites.`,502));else finish(null,stdout);});
 });
}
async function status(){
 const roots=authorizedRoots();
 const active=process.env.REA_ENABLED==='1'&&roots.length>0;
 const base={enabled:active,configured:roots.length>0,cliReady:false,version:null,actions:Object.entries(ACTIONS).map(([id,x])=>({id,label:x.label})),requires:'Node.js >=22.19.0, >=24.11.0, or >=26',upstream:'https://github.com/morluto/rea'};
 if(!active)return {...base,message:'Disabled until REA_ENABLED=1 and REA_ALLOWED_ROOTS is configured.'};
 const [major,minor]=process.versions.node.split('.').map(Number);
 if(!((major===22&&minor>=19)||(major===24&&minor>=11)||major>=26))return {...base,message:'Installed Node.js is too old for REA. Upgrade Node separately.'};
 try {const out=await runCli(['--version'],{timeout:4500,outputLimit:8192});return {...base,cliReady:true,version:out.trim().slice(0,100),message:'REA CLI responded; target-specific analysis not yet verified.'};}
 catch {return {...base,message:'REA CLI unavailable or did not respond. Install official rea-agents separately.'};}
}
async function analyze(request){
 if(!enabled())throw err('REA is disabled. Configure REA_ENABLED=1 and REA_ALLOWED_ROOTS on the local server.',503);
 if(!request||typeof request!=='object'||Array.isArray(request))throw err('Invalid REA request');
 const action=Object.hasOwn(ACTIONS,request.action)?ACTIONS[request.action]:null;
 if(!action)throw err('Unsupported or non-read-only REA analysis mode.');
 const target=verifyTarget(request.path,action.kind);
 const output=await runCli([action.command,target,'--json'],{timeout:Math.min(180000,Math.max(1000,Number(process.env.REA_TIMEOUT_MS)||90000))});
 let result;
 try {result=JSON.parse(output);} catch {throw err('REA returned invalid JSON (check official CLI version and dependencies).',502);}
 // Do not relay unbounded Evidence from large applications to a browser.
 return {ok:true,action:request.action,target:target,version:'REA CLI',evidence:result,limitations:'REA evidence requires human review. This result is not a deployment or safety approval.'};
}
module.exports={ACTIONS,authorizedRoots,verifyTarget,enabled,runCli,status,analyze};
