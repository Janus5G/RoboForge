'use strict';
// Separate Siemens products expose different APIs. This performs a GET against a configured, fixed HTTPS origin.
async function inspect({path}){
  const base=process.env.SIEMENS_API_BASE;
  if(!base)throw Object.assign(new Error('SIEMENS_API_BASE is not configured. Consult the product API documentation before connecting.'),{status:503});
  const token=process.env.SIEMENS_API_TOKEN;
  if(!token)throw Object.assign(new Error('SIEMENS_API_TOKEN is not configured'),{status:503});
  let root;try{root=new URL(base);}catch{throw Object.assign(new Error('Invalid SIEMENS_API_BASE'),{status:400});}
  if(root.protocol!=='https:'||root.username||root.password||root.search||root.hash)throw Object.assign(new Error('Siemens base URL must be HTTPS without embedded credentials'),{status:400});
  if(typeof path!=='string'||!/^\/[a-zA-Z0-9/_-]{1,150}$/.test(path)||path.includes('//')||path.includes('..'))throw Object.assign(new Error('Invalid Siemens relative path'),{status:400});
  const target=new URL(path.slice(1),root.toString().replace(/\/*$/,'/') );
  if(target.origin!==root.origin)throw Object.assign(new Error('Origin mismatch'),{status:400});
  let r;try{r=await fetch(target,{headers:{Authorization:'Bearer '+token,Accept:'application/json'},signal:AbortSignal.timeout(12000),redirect:'error'});}catch{throw Object.assign(new Error('Siemens API connection failed'),{status:502});}
  if(!r.ok)throw Object.assign(new Error('Siemens API returned HTTP '+r.status),{status:502});
  const b=await r.text();if(b.length>120000)throw Object.assign(new Error('Siemens API response exceeds limit'),{status:502});
  try{return {data:JSON.parse(b)};}catch{throw Object.assign(new Error('Siemens API returned non-JSON body'),{status:502});}
}
module.exports={inspect};
