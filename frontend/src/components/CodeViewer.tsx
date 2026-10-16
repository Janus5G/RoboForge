import {useState} from 'react';
import {download} from '../lib';
import type {GenerateResult} from '../plugins/types';
export function CodeViewer({result}:{result:GenerateResult|null}){
 const [selected,setSelected]=useState(-1);
 if(!result)return <section className="panel"><h2>Code Viewer</h2><p className="muted">Generated code will appear here. Open AI Generator first.</p></section>;
 const f=selected<0?null:result.files[selected];
 return <div className="column"><div className="heading"><div><p className="eyebrow">WORKSPACE / CODE VIEWER</p><h1>Generated source.</h1><p className="muted">Code is untrusted until reviewed and tested.</p></div><button className="ghost" onClick={()=>download('roboforge-output.txt',result.code)}>↓ Download full response</button></div><div className="code-layout"><section className="panel"><h3>FILES</h3><button className={'file-tab '+(selected===-1?'selected':'')} onClick={()=>setSelected(-1)}>▤ Full response</button>{result.files.map((item,i)=><button className={'file-tab '+(selected===i?'selected':'')} key={item.path} onClick={()=>setSelected(i)}>▤ {item.path}</button>)}</section><section className="panel editor"><div className="row spread"><span>{f?.path||'response.txt'}</span><div className="row"><button className="ghost" onClick={()=>navigator.clipboard?.writeText(f?.content||result.code)}>Copy</button><button className="ghost" onClick={()=>download(f?.path||'roboforge-output.txt',f?.content||result.code)}>Download</button></div></div><pre className="source-code">{f?.content||result.code}</pre></section></div></div>;
}
