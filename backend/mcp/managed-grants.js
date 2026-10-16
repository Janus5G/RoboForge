'use strict';
// Managed mode is a verifier only. No ChromaPoints, pricing, or issuer secrets.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const META_KEY = 'net.aagii.chromaneural/execution-grant';
const DOMAIN = Buffer.from('RoboForge/ChromaNeural-Grant/v1\n', 'utf8');
const MAX_TTL_MS = 30000;
const MAX_CLOCK_SKEW_MS = 5000;
const MAX_JOURNAL_ENTRIES = 4096;
const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
const HEX = /^[0-9a-f]{64}$/;
const BASE64URL = /^[A-Za-z0-9_-]+$/;
const PAYLOAD_KEYS = ['schemaVersion','issuer','audience','sessionId','authorizationId','reservationId','tool','argumentsSha256','issuedAtMs','expiresAtMs','nonce'];
const ENVELOPE_KEYS = ['keyId','payload','signature'];
const RESOURCE_KEYS = new Set(['maxCpuMicros','maxMemoryBytes','maxWallMillis','maxProcesses','maxInputBytes','maxOutputBytes']);
// This first adapter is a single Refract subprocess. CPU, RAM, process-tree and GPU
// ceilings need verified OS containment outside RoboForge; refuse unsupported
// ceilings instead of claiming enforcement from an elapsed-time estimate.
const UNSUPPORTED_CEILINGS = new Set(['maxCpuMicros','maxMemoryBytes','maxProcesses']);
const LOCAL_BOUNDS = Object.freeze({maxWallMillis:5500,maxInputBytes:8192,maxOutputBytes:30000});
function validateResourceEnvelope(value) {
  if(value===undefined)return Object.freeze({});
  if(!assertPlain(value)||Object.keys(value).length===0)throw new Error('Invalid resource envelope');
  const validated={};
  for(const [name,number] of Object.entries(value)){
    if(!RESOURCE_KEYS.has(name)||!Number.isSafeInteger(number)||number<=0)throw new Error('Invalid resource envelope ceiling');
    if(UNSUPPORTED_CEILINGS.has(name))throw new Error('Resource ceiling requires verified external OS containment: '+name);
    // The first gateway supports one known bounded subprocess only.
    if(!Object.hasOwn(LOCAL_BOUNDS,name))throw new Error('Unsupported resource limit');
    validated[name]=Math.min(number,LOCAL_BOUNDS[name]);
  }
  return Object.freeze(validated);
}
function preflightToolResources(name,args,limits){
  if(name!=='roboforge_refract_compile_cpl_v1')throw new Error('No verified resource enforcement for this tool');
  const inputBytes=Buffer.byteLength(canonicalJson(args),'utf8');
  if(limits.maxInputBytes!==undefined && inputBytes>limits.maxInputBytes)throw new Error('Input resource ceiling exceeded');
  return {inputBytes};
}


function assertPlain(v) { return v !== null && typeof v === 'object' && !Array.isArray(v) && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null); }
function exactKeys(obj, keys) { return assertPlain(obj) && Object.keys(obj).length === keys.length && keys.every(k => Object.hasOwn(obj,k)); }
function scalarString(s) {
  if(typeof s !== 'string')throw new Error('Non-string JSON value');
  for(let i=0;i<s.length;i++){
    const c=s.charCodeAt(i);
    if(c>=0xd800 && c<=0xdbff){const n=s.charCodeAt(++i);if(!(n>=0xdc00&&n<=0xdfff))throw new Error('Invalid Unicode surrogate');}
    else if(c>=0xdc00&&c<=0xdfff)throw new Error('Invalid Unicode surrogate');
  }
  return s;
}
function unicodeCompare(a,b){
 const aa=[...a].map(ch=>ch.codePointAt(0)); const bb=[...b].map(ch=>ch.codePointAt(0));
 for(let i=0;i<Math.min(aa.length,bb.length);i++)if(aa[i]!==bb[i])return aa[i]-bb[i];
 return aa.length-bb.length;
}
function escapeAscii(s){
  scalarString(s);
  // Python json.dumps(..., ensure_ascii=True) form, with lower-case hex digits.
  return JSON.stringify(s).replace(/[^\x00-\x7f]/gu,c=>{
    const cp=c.codePointAt(0);
    if(cp<=0xffff)return '\\u'+cp.toString(16).padStart(4,'0');
    const t=cp-0x10000;
    return '\\u'+(0xd800+(t>>10)).toString(16).padStart(4,'0')+'\\u'+(0xdc00+(t&1023)).toString(16).padStart(4,'0');
  });
}
function canonicalJson(v,depth=0){
  if(depth>32)throw new Error('JSON nesting too deep');
  if(v===null)return 'null';
  if(typeof v==='string')return escapeAscii(v);
  if(typeof v==='boolean')return v?'true':'false';
  // V1 explicitly limits arguments to safe integers; floats require a new documented profile.
  if(typeof v==='number' && Number.isSafeInteger(v) && !Object.is(v,-0))return String(v);
  if(Array.isArray(v))return '['+v.map(x=>canonicalJson(x,depth+1)).join(',')+']';
  if(assertPlain(v)){
    const names=Object.keys(v).sort(unicodeCompare);
    if(names.length>512)throw new Error('JSON object too large');
    return '{'+names.map(k=>escapeAscii(k)+':'+canonicalJson(v[k],depth+1)).join(',')+'}';
  }
  throw new Error('Unsupported JSON value (only safe integral numbers in V1)');
}
function digestArgs(args){return crypto.createHash('sha256').update(canonicalJson(args),'utf8').digest('hex');}
function decodeBase64Url(text,size){
 if(typeof text!=='string'||!BASE64URL.test(text)||text.length>2048)throw new Error('Malformed signature encoding');
 const b=Buffer.from(text,'base64url');
 if(b.toString('base64url')!==text||(size!==undefined&&b.length!==size))throw new Error('Malformed signature encoding');
 return b;
}
function noSymlinkParents(p){
  let cur=path.resolve(p);
  for(;;){const stat=fs.lstatSync(cur);if(stat.isSymbolicLink())throw new Error('Symlink path not permitted');const up=path.dirname(cur);if(up===cur)break;cur=up;}
}
function trustedDirectory(directory){
 if(!path.isAbsolute(directory))throw new Error('Replay directory must be absolute');
 noSymlinkParents(directory);
 const st=fs.lstatSync(directory);
 if(!st.isDirectory() || (st.mode&0o077))throw new Error('Replay directory must be private (0700)');
 if(typeof process.getuid==='function' && st.uid!==process.getuid())throw new Error('Replay directory ownership mismatch');
 return path.resolve(directory);
}
function loadPublicKey(file){
 if(!file||!path.isAbsolute(file))throw new Error('Public key path must be absolute');
 noSymlinkParents(file);
 const st=fs.lstatSync(file);
 if(!st.isFile()||st.size>8192||st.size<60)throw new Error('Invalid public key file');
 const source=fs.readFileSync(file);
 // Avoid accepting private signing keys even if crypto could derive a public one.
 if(!source.toString('utf8').includes('-----BEGIN PUBLIC KEY-----'))throw new Error('Expected public verification key only');
 const key=crypto.createPublicKey(source);
 if(key.asymmetricKeyType!=='ed25519')throw new Error('Expected Ed25519 public key');
 return key;
}
function inspectJournalFile(file,cutoff){
 const st=fs.lstatSync(file);
 if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||(st.mode&0o077)||st.size>512||st.size<25)throw new Error('Untrusted replay journal entry');
 if(typeof process.getuid==='function' && st.uid!==process.getuid())throw new Error('Replay journal file ownership mismatch');
 const fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
 try{const entry=JSON.parse(fs.readFileSync(fd,'utf8'));if(!exactKeys(entry,['authorizationIdHash','expiresAtMs','consumedAtMs'])||!HEX.test(entry.authorizationIdHash)||!Number.isSafeInteger(entry.expiresAtMs)||!Number.isSafeInteger(entry.consumedAtMs))throw new Error('Corrupt replay journal');return entry.expiresAtMs + MAX_CLOCK_SKEW_MS < cutoff;} finally {fs.closeSync(fd);}
}
class GrantVerifier {
  constructor({publicKeyFile,sessionId,journalDir}){
    if(typeof sessionId!=='string'||!ID.test(sessionId))throw new Error('Missing/invalid ChromaNeural session ID');
    this.key=loadPublicKey(publicKeyFile);
    this.keyId=crypto.createHash('sha256').update(this.key.export({type:'spki',format:'der'})).digest('hex');
    this.sessionId=sessionId;
    this.journalDir=trustedDirectory(journalDir);
    this.prune(Date.now());
  }
  prune(now){
    trustedDirectory(this.journalDir);
    const all=fs.readdirSync(this.journalDir);
    if(all.length>MAX_JOURNAL_ENTRIES)throw new Error('Replay journal capacity reached');
    for(const name of all){
      if(!/^[0-9a-f]{64}\.json$/.test(name))throw new Error('Unexpected replay state entry');
      const p=path.join(this.journalDir,name);
      if(inspectJournalFile(p,now))fs.unlinkSync(p);
    }
    return all.length;
  }
  validate(envelope,tool,args,now=Date.now()){
    if(!exactKeys(envelope,ENVELOPE_KEYS)||!assertPlain(envelope.payload))throw new Error('Invalid grant envelope');
    if(![PAYLOAD_KEYS.length,PAYLOAD_KEYS.length+1].includes(Object.keys(envelope.payload).length)
       ||!PAYLOAD_KEYS.every(k=>Object.hasOwn(envelope.payload,k))
       ||(Object.keys(envelope.payload).length===PAYLOAD_KEYS.length+1 && !Object.hasOwn(envelope.payload,'resourceEnvelope')))
      throw new Error('Invalid grant fields');
    const g=envelope.payload;
    if(envelope.keyId!==this.keyId)throw new Error('Unknown verification key');
    if(g.schemaVersion!==1||g.issuer!=='ChromaNeural'||g.audience!=='RoboForge'||g.sessionId!==this.sessionId)throw new Error('Invalid grant scope');
    if(!ID.test(g.authorizationId)||!ID.test(g.reservationId)||!ID.test(g.tool)||typeof g.nonce!=='string')throw new Error('Invalid grant identifiers');
    if(decodeBase64Url(g.nonce).length<16||decodeBase64Url(g.nonce).length>48)throw new Error('Invalid grant nonce');
    if(g.tool!==tool||typeof g.argumentsSha256!=='string'||!HEX.test(g.argumentsSha256)||g.argumentsSha256!==digestArgs(args))throw new Error('Grant not bound to this call');
    if(!Number.isSafeInteger(g.issuedAtMs)||!Number.isSafeInteger(g.expiresAtMs)||!Number.isSafeInteger(now)||g.expiresAtMs<=g.issuedAtMs||g.expiresAtMs-g.issuedAtMs>MAX_TTL_MS||g.issuedAtMs>now+MAX_CLOCK_SKEW_MS||g.expiresAtMs<=now)throw new Error('Grant expired or out of time bounds');
    const resourceEnvelope=validateResourceEnvelope(g.resourceEnvelope);
    // Pre-dispatch policy and input size checks must complete BEFORE consumption.
    const preflight=preflightToolResources(tool,args,resourceEnvelope);
    const signature=decodeBase64Url(envelope.signature,64);
    if(!crypto.verify(null,Buffer.concat([DOMAIN,Buffer.from(canonicalJson(g),'utf8')]),this.key,signature))throw new Error('Invalid grant signature');
    return {authorizationId:g.authorizationId,reservationId:g.reservationId,tool:g.tool,expiresAtMs:g.expiresAtMs,resourceEnvelope,preflight};
  }
  consume(validated){
    if(validated.expiresAtMs<=Date.now())throw new Error('Authorization expired before dispatch');
    // Atomic exclusive creation prevents concurrent reuse across worker processes.
    this.prune(Date.now());
    const hash=crypto.createHash('sha256').update(validated.authorizationId,'utf8').digest('hex');
    const target=path.join(this.journalDir,hash+'.json');
    let fd;
    try {
      fd=fs.openSync(target,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);
      fs.writeFileSync(fd,JSON.stringify({authorizationIdHash:hash,expiresAtMs:validated.expiresAtMs,consumedAtMs:Date.now()}));
      fs.fsyncSync(fd);
    } finally {if(fd!==undefined)fs.closeSync(fd);}
    // Do not dispatch if persistence is not durable. This can conservatively burn a grant.
    const directory=fs.openSync(this.journalDir,fs.constants.O_RDONLY|fs.constants.O_DIRECTORY|fs.constants.O_NOFOLLOW);
    try{fs.fsyncSync(directory);}finally{fs.closeSync(directory);}
  }
}
let cached;let cachedKey;
function isManaged(){return process.env.ROBOFORGE_CHROMANEURAL_MANAGED==='1';}
function getVerifier(){
 const configuration=[process.env.ROBOFORGE_CHROMANEURAL_PUBLIC_KEY_FILE,process.env.ROBOFORGE_CHROMANEURAL_SESSION_ID,process.env.ROBOFORGE_GRANT_STATE_DIR].join('\0');
 if(configuration!==cachedKey){cachedKey=configuration;try{cached=new GrantVerifier({publicKeyFile:process.env.ROBOFORGE_CHROMANEURAL_PUBLIC_KEY_FILE,sessionId:process.env.ROBOFORGE_CHROMANEURAL_SESSION_ID,journalDir:process.env.ROBOFORGE_GRANT_STATE_DIR});}catch(e){cached={failure:e.message};}}
 if(cached?.failure)throw new Error('Managed verifier unavailable: '+cached.failure);
 return cached;
}
function verifierReady(){if(!isManaged())return false;try{getVerifier();return true;}catch{return false;}}
module.exports={META_KEY,DOMAIN,MAX_TTL_MS,LOCAL_BOUNDS,isManaged,getVerifier,verifierReady,GrantVerifier,canonicalJson,digestArgs,validateResourceEnvelope,preflightToolResources};
