'use strict';
/** Optional adapter to an operator-installed trusted Chromaplex Coding Agent checkout.
 * No installation, code execution from requests, or bypass of its Secure Compile Gate.
 */
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const crypto=require('node:crypto');
const WORKER=path.resolve(__dirname,'../workers/coding-agent-bridge.py');
const TARGETS=Object.freeze([
 {id:'linux-desktop',label:'Linux Desktop'},
 {id:'web-wasm',label:'Web / WebAssembly'},
 {id:'esp32',label:'ESP32 / ESP32-S3'},
 {id:'arduino',label:'Arduino / MCU'},
 {id:'raspberry-pi',label:'Raspberry Pi Linux ARM'},
 {id:'chromaplex-vm',label:'ChromaPlex CPL / CPA'},
 {id:'windows-desktop',label:'Windows source export (no supported Windows build)'}
]);
const TARGET_IDS=new Set(TARGETS.map(t=>t.id));
const ALLOWED_MODES=new Set(['review','secure-preflight','verify-artifact']);
function safeRoot(){
 try{
  const value=process.env.CHROMAPLEX_AGENT_ROOT;
  if(!value||!path.isAbsolute(value))return null;
  const root=fs.realpathSync(value);
  if(!fs.statSync(root).isDirectory())return null;
  for(const f of ['chromaplex_agent/security.py','chromaplex_agent/memory_safety.py','chromaplex_agent/secure_compile.py','chromaplex_agent/targets.py','chromaplex_agent/verify_build.py']){
   const file=path.join(root,f), real=fs.realpathSync(file);
   if(!real.startsWith(root+path.sep)||!fs.statSync(real).isFile())return null;
  }
  return root;
 }catch{return null;}
}
// The standalone .deb seals its installed payload with SHA256SUMS. Verify that
// seal before importing upstream Python code, if this is a packaged install.
// Operator-approved developer checkouts have no package seal and remain explicit
// trust decisions, not claims of publisher verification.
function verifyInstalledSeal(root){
 const manifest=path.join(root,'SHA256SUMS');
 if(!fs.existsSync(manifest))return {packaged:false,verified:false};
 if(fs.lstatSync(manifest).isSymbolicLink()||fs.statSync(manifest).size>500000)throw Error('Untrusted Coding Agent install checksum manifest');
 const lines=fs.readFileSync(manifest,'utf8').trim().split('\n');
 if(!lines.length||lines.length>5000)throw Error('Invalid Coding Agent checksum inventory');
 for(const line of lines){
  const match=/^([a-f0-9]{64}) [ *](\.\/[^\r\n]+)$/.exec(line);
  if(!match)throw Error('Invalid Coding Agent checksum line');
  const relative=match[2].slice(2);
  if(relative.split('/').some(x=>!x||x==='.'||x==='..'))throw Error('Unsafe installed file path');
  const candidate=path.resolve(root,relative);
  if(!candidate.startsWith(root+path.sep)||fs.lstatSync(candidate).isSymbolicLink()||!fs.statSync(candidate).isFile())throw Error('Untrusted installed Coding Agent file');
  const hash=crypto.createHash('sha256').update(fs.readFileSync(candidate)).digest('hex');
  if(hash!==match[1])throw Error('Installed Coding Agent checksum mismatch');
 }
 return {packaged:true,verified:true};
}
function enabled(){return process.env.CHROMAPLEX_AGENT_ENABLED==='1';}
function status(){const root=safeRoot();return {
 id:'coding-agent',enabled:enabled(),configured:!!root,
 readiness:!enabled()?'disabled by default':!root?'trusted local Coding Agent checkout not configured':'source available; full secure build not verified',
 externalVerified:false, version:'external installation',
 secureCompileGate:'Full build/release remains in standalone Coding Agent; RoboForge can request fail-closed source preflight with mandatory ClamAV.',
 targets:TARGETS,standaloneLinuxPackage:'chromaplex-coding-agent',
 nativeMcpToolsExposed:false,modelDownloads:false
};}
function validateReview(b){
 if(!b||typeof b!=='object'||Array.isArray(b))throw Object.assign(Error('Invalid request'),{status:400});
 if(!TARGET_IDS.has(b.target))throw Object.assign(Error('Unknown target profile'),{status:400});
 if(typeof b.filename!=='string'||b.filename.length>100||!(/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(b.filename))||b.filename==='..')throw Object.assign(Error('Invalid single-file name'),{status:400});
 if(typeof b.source!=='string'||!b.source.length||Buffer.byteLength(b.source,'utf8')>12000||b.source.includes('\0'))throw Object.assign(Error('Source must be 1–12000 UTF-8 bytes'),{status:400});
 if(typeof b.language!=='string'||b.language.length>40||/[\x00-\x1f]/.test(b.language))throw Object.assign(Error('Invalid language'),{status:400});
 const mode=b.mode==='secure-preflight'?'secure-preflight':'review';
 return {mode,target:b.target,filename:b.filename,source:b.source,language:b.language};
}
function validVerifyPath(requested){
 if(typeof requested!=='string'||requested.length>4096||!path.isAbsolute(requested)||requested.includes('\0'))throw Object.assign(Error('Absolute verification path required'),{status:400});
 const allowed=(process.env.CHROMAPLEX_AGENT_VERIFY_ROOTS||'').split(path.delimiter).filter(Boolean).map(p=>{try{return fs.realpathSync(p);}catch{return null;}}).filter(Boolean);
 if(!allowed.length)throw Object.assign(Error('Build verification disabled until CHROMAPLEX_AGENT_VERIFY_ROOTS is set by the operator'),{status:403});
 const real=fs.realpathSync(requested);
 if(!fs.statSync(real).isFile()||!allowed.some(root=>real.startsWith(root+path.sep)))throw Object.assign(Error('Artifact outside approved verification roots'),{status:403});
 // Prevent symlink aliasing that escapes the explicitly selected artifact.
 if(path.resolve(requested)!==real)throw Object.assign(Error('Artifact symlinks are not accepted'),{status:403});
 return real;
}
function runWorker(payload,timeoutMs){
 if(!enabled())return Promise.reject(Object.assign(Error('Coding Agent integration disabled'),{status:403}));
 const root=safeRoot();if(!root)return Promise.reject(Object.assign(Error('Coding Agent checkout unavailable'),{status:503}));
 try{verifyInstalledSeal(root);}catch{return Promise.reject(Object.assign(Error('Coding Agent installed checksum validation failed'),{status:503}));}
 const python=process.env.CHROMAPLEX_AGENT_PYTHON||'python3';
 if(!/^(?:python3(?:\.\d+)?|\/[^\0\r\n]{1,400})$/.test(python))return Promise.reject(Object.assign(Error('Invalid configured Python interpreter'),{status:503}));
 const data=JSON.stringify(payload);if(Buffer.byteLength(data,'utf8')>16384)return Promise.reject(Object.assign(Error('Source request too large'),{status:413}));
 return new Promise((resolve,reject)=>{
  let done=false,stdout='',stderr='',length=0;
  const child=spawn(python,['-I',WORKER,root],{cwd:root,shell:false,windowsHide:true,stdio:['pipe','pipe','pipe'],env:{PATH:process.env.PATH||'/usr/bin:/bin',LANG:'C.UTF-8',HOME:'/nonexistent',PYTHONDONTWRITEBYTECODE:'1'}});
  const finish=(e,data)=>{if(done)return;done=true;clearTimeout(timer);if(e)reject(e);else resolve(data);};
  const timer=setTimeout(()=>{child.kill('SIGKILL');finish(Object.assign(Error('Coding Agent analysis timed out'),{status:504}));},timeoutMs);
  child.on('error',()=>finish(Object.assign(Error('Python runtime unavailable'),{status:503})));
  child.stdout.on('data',chunk=>{length+=chunk.length;if(length>24000){child.kill('SIGKILL');finish(Object.assign(Error('Coding Agent output exceeds safety limit'),{status:502}));}else stdout+=chunk.toString('utf8');});
  child.stderr.on('data',chunk=>{if(stderr.length<1000)stderr+=chunk.toString('utf8').slice(0,1000-stderr.length);});
  child.on('close',code=>{if(done)return;if(code!==0){finish(Object.assign(Error('Coding Agent bridge failed closed; inspect trusted installation and ClamAV availability'),{status:503}));return;}
   try{const result=JSON.parse(stdout);if(!result||typeof result.ok!=='boolean')throw Error();finish(null,result);}catch{finish(Object.assign(Error('Coding Agent bridge returned invalid data'),{status:502}));}});
  child.stdin.on('error',()=>{});child.stdin.end(data,'utf8');
 });
}
async function inspect(input){const data=validateReview(input);return runWorker(data,data.mode==='secure-preflight'?25000:7000);}
async function verify(input){const real=validVerifyPath(input?.path);return runWorker({mode:'verify-artifact',path:real},8000);}
module.exports={TARGETS,safeRoot,enabled,status,inspect,verify,validVerifyPath,verifyInstalledSeal};
