export async function api<T>(url:string,body?:unknown):Promise<T>{
 const r=await fetch(url,body===undefined?undefined:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 let j:unknown;try{j=await r.json();}catch{throw new Error('Server returned invalid JSON');}
 if(!r.ok){const msg=(j&&typeof j==='object'&&'error' in j)?String((j as {error:unknown}).error):`HTTP ${r.status}`;throw new Error(msg);}
 return j as T;
}
export function download(name:string,text:string){const blob=new Blob([text],{type:'text/plain;charset=utf-8'});const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=name.split('/').pop()||'generated.txt';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);}
export function str(v:unknown,fallback=''):string{return typeof v==='string'?v:fallback;}
export function isWs(v:string):boolean {try{const u=new URL(v);return u.protocol==='ws:'||u.protocol==='wss:';}catch{return false;}}
