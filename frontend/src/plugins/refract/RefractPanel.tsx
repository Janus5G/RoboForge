import {useEffect,useState} from 'react';
import type {PluginComponentProps} from '../types';
import {api} from '../../lib';
type Status={enabled:boolean;configured:boolean;readiness:string;externalVerified:boolean};
type Result={dialect:string;cpa:string;verified:boolean;limitations:string};
export default function RefractPanel(_props:PluginComponentProps){
 const [status,setStatus]=useState<Status|null>(null);const [source,setSource]=useState('');const [result,setResult]=useState<Result|null>(null);const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 useEffect(()=>{void api<Status>('/api/refract/status').then(setStatus).catch(e=>setError((e as Error).message));},[]);
 async function compile(){setError('');setResult(null);setBusy(true);try{setResult(await api<Result>('/api/refract/compile',{source}));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <div className="plugin-panel"><h2>Refract Studio · CPL compiler preview</h2><p className="muted">An optional bridge to your separately installed Refract Studio. Source code is compiled to CPA text only. CPA is never executed and your Refract Studio files are not changed.</p><div className="alert">{status?(status.enabled&&status.configured?'Refract checkout configured. Compiler run still needs verification.':status.readiness):'Checking module readiness…'}</div><div className="field"><label htmlFor="refract-source">CPL source (max 4096 characters)</label><textarea id="refract-source" value={source} onChange={e=>setSource(e.target.value.slice(0,4096))} rows={8} spellCheck={false}/></div><button className="primary" type="button" disabled={busy||!status?.enabled||!status?.configured||!source.trim()} onClick={()=>void compile()}>{busy?'Compiling…':'Preview CPL → CPA'}</button>{error&&<div role="alert" className="alert danger">{error}</div>}{result&&<section><p className="muted">{result.dialect} · {result.limitations}</p><pre className="log">{result.cpa}</pre></section>}</div>;
}
