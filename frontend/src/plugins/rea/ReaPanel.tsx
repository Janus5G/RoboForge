import {useEffect,useState} from 'react';
import type {PluginComponentProps} from '../types';
import {api,download,str} from '../../lib';
type Action='javascript'|'dotnet'|'go'|'rust';
type Status={enabled:boolean;configured:boolean;cliReady:boolean;version:string|null;message?:string;requires:string;upstream:string;actions:{id:Action;label:string}[]};
type Analysis={ok:boolean;action:Action;target:string;evidence:unknown;limitations:string};
const DEFAULT_MODES=[{id:'javascript',label:'JavaScript / Electron (static)'},{id:'dotnet',label:'.NET assembly metadata'},{id:'go',label:'Go build metadata'},{id:'rust',label:'Rust crate metadata'}] as const;
export default function ReaPanel({config,onConfigChange}:PluginComponentProps){
 const [status,setStatus]=useState<Status|null>(null);
 const [mode,setMode]=useState<Action>('javascript');
 const [target,setTarget]=useState(str(config.lastPath,''));
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [result,setResult]=useState<Analysis|null>(null);
 const [confirmed,setConfirmed]=useState(false);
 async function refresh(){try{setStatus(await api<Status>('/api/rea/status'));}catch(e){setError((e as Error).message);}}
 useEffect(()=>{void refresh();},[]);
 async function run(){setError('');setResult(null);if(!confirmed){setError('Confirm authorization for this target before proceeding.');return;}
  setBusy(true);try{const r=await api<Analysis>('/api/rea/analyze',{action:mode,path:target});setResult(r);onConfigChange({...config,lastPath:target});}
  catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const preview=result?(JSON.stringify(result.evidence,null,2)||''):'';
 return <div className="plugin-panel rea-panel">
   <h2>REA · Reverse Engineering Analysis</h2>
   <p className="muted">Analyze files you own or are authorized to inspect. REA runs as a separately installed local CLI tool, not in the browser. This integration currently exposes selected static analysis commands; full REA agent/MCP workflows remain external.</p>
   <div className="rea-readiness" role="status"><span className={'rea-status-dot '+(status?.cliReady?'ready':'idle')}/><div><strong>{status?.cliReady?'REA CLI detected':status?.message?'REA requires setup':'Checking local REA status…'}</strong><small>{status?.cliReady?(status.version||'CLI responsive'):(status?.message||'No external service is contacted')}</small></div><button className="outline-button" type="button" onClick={()=>void refresh()} disabled={busy}>Check again</button></div>
   <div className="field"><label htmlFor="rea-mode">Analysis type</label><select id="rea-mode" value={mode} onChange={e=>{setMode(e.target.value as Action);setResult(null);setConfirmed(false);}}>{DEFAULT_MODES.map(a=><option key={a.id} value={a.id}>{a.label}</option>)}</select></div>
   <div className="field"><label htmlFor="rea-path">Local absolute path (on the RoboForge server)</label><input id="rea-path" autoComplete="off" spellCheck={false} placeholder={mode==='javascript'?'/home/user/projects/example-app or C:\\work\\app.asar':'/home/user/artifacts/program.dll'} value={target} onChange={e=>{setTarget(e.target.value);setConfirmed(false);}}/></div>
   <label className="rea-consent"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span>I have permission to analyze this file or application. I understand REA may read files under the authorized server-side workspace.</span></label>
   <div className="rea-actions"><button className="primary" type="button" disabled={busy||!status?.cliReady||!confirmed||!target.trim()} onClick={()=>void run()}>{busy?'Analyzing (may take time)…':'Run local REA analysis'}</button><a href="https://github.com/morluto/rea" target="_blank" rel="noreferrer" className="outline-button">Official REA project ↗</a></div>
   {error&&<div role="alert" className="alert danger">{error}</div>}
   {!status?.cliReady&&<div className="alert">Install REA separately with <code>npm install --global rea-agents</code>. In server configuration set <code>REA_ENABLED=1</code> and <code>REA_ALLOWED_ROOTS</code> to approved directories. REA requires Node.js 22.19+/24.11+/26+. Do not expose the local RoboForge API to untrusted networks.</div>}
   {result&&<section className="rea-output"><div className="rea-result-title"><div><strong>Analysis returned Evidence</strong><small>Command: {mode} · Human review required</small></div><button className="outline-button" type="button" onClick={()=>download('rea-evidence.json',JSON.stringify(result,null,2))}>Download JSON</button></div><p className="muted">{result.limitations}</p><pre className="log rea-log">{preview.length>30000?preview.slice(0,30000)+'\n\n[PREVIEW TRUNCATED — download full JSON]':preview}</pre></section>}
 </div>;
}
