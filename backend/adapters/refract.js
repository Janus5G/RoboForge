'use strict';
/** Optional compiler-only interface to separately installed Refract Studio.
 * This uses Refract's own cpl_adapter.compile_cpl, not a replacement compiler.
 * No CPA execution, optical writes, network, shell, or auto-installation.
 */
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
function safeRoot(){
 try{const p=process.env.REFRACT_ROOT;if(!p||!path.isAbsolute(p))return null;
   const real=fs.realpathSync(p);if(!fs.statSync(real).isDirectory()||!fs.statSync(path.join(real,'refracteditor','cpl_adapter.py')).isFile())return null;return real;
 }catch{return null;}
}
function status(){const root=safeRoot();return {enabled:process.env.REFRACT_ENABLED==='1',configured:!!root,readiness:process.env.REFRACT_ENABLED==='1'&&root?'runtime not verified; check with approved compiler preview':'disabled or trusted Refract checkout not configured',externalVerified:false};}
function compile(source,{maxWallMillis=5500,maxOutputBytes=26000}={}){
 if(process.env.REFRACT_ENABLED!=='1'||!safeRoot())return Promise.reject(new Error('Refract compiler unavailable (explicitly enable REFRACT_ENABLED=1 and configure REFRACT_ROOT)'));
 if(typeof source!=='string'||source.length<1||source.length>4096||source.includes('\0'))return Promise.reject(new Error('Invalid CPL source'));
 if(!Number.isSafeInteger(maxWallMillis)||maxWallMillis<1||maxWallMillis>5500||!Number.isSafeInteger(maxOutputBytes)||maxOutputBytes<1||maxOutputBytes>26000)return Promise.reject(new Error('Invalid Refract resource ceiling'));
 const root=safeRoot();
 const python=process.env.REFRACT_PYTHON||'python3';
 // Python -I prevents PYTHONPATH/site/user injection. Only the fixed trusted module is imported.
 const script="import sys,json;sys.path.insert(0,sys.argv[1]);from refracteditor.cpl_adapter import compile_cpl;source=sys.stdin.read(8193);assert len(source)<=8192,(\"input limit\");cpa,dialect=compile_cpl(source);print(json.dumps({'dialect':dialect,'cpa':cpa}))";
 return new Promise((resolve,reject)=>{
  let output='',errors='',total=0,settled=false;
  const finish=(e,v)=>{if(settled)return;settled=true;clearTimeout(timer);if(e)reject(e);else resolve(v);};
  const child=spawn(python,['-I','-c',script,root],{shell:false,cwd:root,stdio:['pipe','pipe','pipe'],env:{PATH:process.env.PATH||'',LANG:'C.UTF-8',HOME:process.env.HOME||'/nonexistent'},windowsHide:true});
  const timer=setTimeout(()=>{child.kill('SIGKILL');finish(new Error('Refract compiler timed out'));},maxWallMillis);
  child.on('error',()=>finish(new Error('Configured Python interpreter unavailable')));
  child.stdout.on('data',b=>{total+=b.length;if(total>maxOutputBytes){child.kill('SIGKILL');finish(new Error('Refract output too large'));}else output+=b.toString('utf8');});
  child.stderr.on('data',b=>{if(errors.length<3000)errors+=b.toString('utf8').slice(0,3000-errors.length);});
  child.on('close',code=>{if(settled)return;if(code!==0){finish(new Error('Refract compiler rejected input or its dependencies are unavailable'));return;}try{const v=JSON.parse(output);if(typeof v.cpa!=='string'||typeof v.dialect!=='string')throw Error();finish(null,{dialect:v.dialect,cpa:v.cpa,verified:false,limitations:'Compiler preview only. Generated CPA was not executed or independently verified.'});}catch{finish(new Error('Unexpected Refract compiler output'));}});
  child.stdin.on('error',()=>{});child.stdin.end(source,'utf8');
 });
}
module.exports={safeRoot,status,compile};
