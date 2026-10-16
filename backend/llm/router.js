'use strict';
const {detectTechnologies}=require('../detector');
const defaultSystem=`You are the RoboForge engineering assistant. Produce correct, reviewable code with explicit dependencies, unit tests, supported versions, startup instructions and safe integration details. Label uncertain interfaces, hardware assumptions and placeholders. Never claim code was compiled, hardware-tested or production-ready without actual evidence. Never include credentials. For any robot motion, PLC write, actuator control or firmware update, require human approval and safe operating constraints. If multiple files, use exact headings FILE: relative/path followed by fenced code blocks. Do not run or deploy code.`;
function withSlash(url){return url.replace(/\/+$/,'');}
function safeBase(base,provider){
  let url;try{url=new URL(base);}catch{throw Object.assign(new Error('Invalid provider URL'),{status:400});}
  if(url.username||url.password||url.hash||url.search)throw Object.assign(new Error('Invalid provider URL'),{status:400});
  const localhost=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  if(provider==='ollama') {
    if(!localhost&&process.env.ALLOW_REMOTE_OLLAMA!=='1')throw Object.assign(new Error('Remote Ollama disabled; set ALLOW_REMOTE_OLLAMA=1 explicitly'),{status:400});
    if(url.protocol!=='http:'&&url.protocol!=='https:')throw Object.assign(new Error('Invalid Ollama scheme'),{status:400});
  }else{
    if(url.protocol!=='https:' && !(localhost&&url.protocol==='http:'))throw Object.assign(new Error('External AI requires HTTPS'),{status:400});
  }
  return withSlash(url.toString());
}
async function call(url,options){
  let r;
  try{r=await fetch(url,{...options,signal:AbortSignal.timeout(Number(process.env.AI_TIMEOUT_MS||90000)),redirect:'error'});}catch(err){throw Object.assign(new Error('Provider connection failed: '+String(err.message).slice(0,90)),{status:502});}
  const payload=await r.text();
  if(payload.length>1500000)throw Object.assign(new Error('Provider response too large'),{status:502});
  let data;try{data=JSON.parse(payload);}catch{throw Object.assign(new Error('Provider returned non-JSON data'),{status:502});}
  if(!r.ok)throw Object.assign(new Error('Provider HTTP '+r.status+': '+String(data.error?.message||data.error||r.statusText).slice(0,120)),{status:502});
  return data;
}
async function generate({prompt,provider='ollama',model,apiKey,test=false}){
  if(typeof model!=='undefined' && (typeof model!=='string'||model.length>120))throw Object.assign(new Error('Invalid model'),{status:400});
  const system=defaultSystem;
  if(provider==='ollama') {
    const base=safeBase(process.env.OLLAMA_URL||'http://127.0.0.1:11434','ollama');
    const selected=model||process.env.OLLAMA_MODEL||'qwen3:4b-instruct';
    const result=await call(base+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:selected,stream:false,options:{num_predict:test?100:4096},messages:[{role:'system',content:system},{role:'user',content:prompt}]})});
    const code=result.message?.content;
    if(typeof code!=='string')throw Object.assign(new Error('Ollama missing message.content'),{status:502});
    return {provider,model:selected,code};
  }
  if(!['openai','deepseek','compatible','codex'].includes(provider))throw Object.assign(new Error('Unsupported provider'),{status:400});
  const target=provider==='codex'?'openai':provider;
  let base, envKey, defModel;
  if(target==='openai'){base='https://api.openai.com/v1';envKey=process.env.OPENAI_API_KEY;defModel=process.env.OPENAI_MODEL||'gpt-4.1-mini';}
  if(target==='deepseek'){base='https://api.deepseek.com/v1';envKey=process.env.DEEPSEEK_API_KEY;defModel=process.env.DEEPSEEK_MODEL||'deepseek-chat';}
  if(target==='compatible'){base=process.env.COMPATIBLE_API_URL;envKey=process.env.COMPATIBLE_API_KEY;defModel=process.env.COMPATIBLE_MODEL||'default';if(!base)throw Object.assign(new Error('COMPATIBLE_API_URL not configured'),{status:400});}
  const key=typeof apiKey==='string'&&apiKey.length<4096&&apiKey.trim()?apiKey.trim():envKey;
  if(!key)throw Object.assign(new Error(`No API key configured for ${target}. Set server environment variable or supply a temporary key.`),{status:400});
  const url=safeBase(base,target)+'/chat/completions';
  const selected=model||defModel;
  const result=await call(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({model:selected,temperature:0.2,max_tokens:test?100:4096,messages:[{role:'system',content:system},{role:'user',content:prompt}]})});
  const code=result.choices?.[0]?.message?.content;
  if(typeof code!=='string')throw Object.assign(new Error('Provider missing choices[0].message.content'),{status:502});
  return {provider:target,model:selected,code};
}
module.exports={generate,safeBase};
