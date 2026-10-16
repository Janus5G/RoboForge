'use strict';
const path=require('node:path');
function safePath(name) {
  if(typeof name!=='string'||name.length>180 || name.includes('\\') || name.includes('\0') || name.startsWith('/') || /^[A-Za-z]:/.test(name) || name.split('/').some(s=>!s||s==='.'||s==='..')) return null;
  return name;
}
function extractFiles(text){
  const result=[];const seen=new Set();
  // Explicit file-heading convention only; never interpret arbitrary untrusted output as a filesystem path.
  const pattern=/^\s*(?:###\s*)?(?:FILE|File):\s*`?([^`\r\n]+?)`?\s*\r?\n```[\w.+-]*\s*\n([\s\S]*?)\n```/gm;
  let match;
  while((match=pattern.exec(text))&&result.length<40){const file=safePath(match[1].trim());if(file&&!seen.has(file)){seen.add(file);result.push({path:file,content:match[2].slice(0,150000)});}}
  return result;
}
function redactError(err){const msg=String(err?.message||'External integration error');return msg.replace(/(?:sk-[a-zA-Z0-9_-]{8,}|Bearer\s+\S+|api[_-]?key\s*[=:]\s*\S+)/gi,'[REDACTED]').slice(0,220);}
module.exports={safePath,extractFiles,redactError};
