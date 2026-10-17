import {useEffect,useState} from 'react';
import {api} from '../../lib';
import type {PluginComponentProps} from '../types';

type Status={enabled:boolean;configured:boolean;readiness:string;externalVerified:boolean;secureCompileGate:string;targets:{id:string;label:string}[];standaloneLinuxPackage:string;nativeMcpToolsExposed:boolean};
type Finding={file:string;rule:string;level:string;detail:string};
type Report={ok:boolean;operation:string;notice?:string;error?:string;target?:string;staticAnalysis?:{state:string;findings:Finding[]};memorySafety?:{state:string;findings:Finding[]};sourceHashes?:Record<string,string>;malwareScan?:string;verified?:boolean;problems?:string[];fullSecureBuildVerified?:boolean};
type Kind='review'|'preflight'|'verify';
const defaults=[{id:'linux-desktop',label:'Linux Desktop'},{id:'web-wasm',label:'Web / WASM'},{id:'esp32',label:'ESP32'},{id:'arduino',label:'Arduino'},{id:'raspberry-pi',label:'Raspberry Pi ARM'},{id:'chromaplex-vm',label:'CPL / CPA'}];
export default function CodingAgentPanel({config,kind='review'}:PluginComponentProps&{kind?:Kind}){
 const [status,setStatus]=useState<Status|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [report,setReport]=useState<Report|null>(null);
 const [source,setSource]=useState(typeof config.suggestedSource==='string'?config.suggestedSource.slice(0,12000):'');
 const [target,setTarget]=useState('linux-desktop');const [filename,setFilename]=useState('main.py');const [language,setLanguage]=useState('Python (Linux)');const [artifact,setArtifact]=useState('');
 async function refresh(){try{setError('');setStatus(await api<Status>('/api/coding-agent/status'));}catch(e){setError((e as Error).message);}}
 useEffect(()=>{void refresh();},[]);
 useEffect(()=>{if(typeof config.suggestedSource==='string'&&config.suggestedSource)setSource(config.suggestedSource.slice(0,12000));},[config.suggestedSource]);
 async function run(){setError('');setReport(null);setBusy(true);try{
  const result=await api<Report>(kind==='verify'?'/api/coding-agent/verify':kind==='preflight'?'/api/coding-agent/preflight':'/api/coding-agent/review',kind==='verify'?{path:artifact}:{source,filename,language,target});setReport(result);
 }catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const yes=status?.enabled&&status.configured;
 return <div className="plugin-panel">
  <h2>{kind==='review'?'Target-aware source analysis':kind==='preflight'?'Secure Compile Gate · Source preflight':'Independent build verification'}</h2>
  <p className="muted">An opt-in connection to the <a href="https://github.com/Janus5G/Chromaplex-Coding-Agent" target="_blank" rel="noopener noreferrer">official ChromaPlex Coding Agent</a> installed separately on Linux. This panel never installs models, flashes hardware or releases executable binaries.</p>
  <div className="alert">{status?status.readiness:'Checking trusted Coding Agent checkout…'} <button className="ghost" type="button" onClick={()=>void refresh()}>Refresh</button></div>
  {kind==='verify'? <>
    <div className="field"><label htmlFor="agent-artifact">Absolute path to compiled binary in an operator-approved verification folder</label><input id="agent-artifact" value={artifact} onChange={e=>setArtifact(e.target.value)} placeholder="/home/user/approved-builds/program.bin" /></div>
    <p className="muted">The existing Coding Agent security manifest and SHA-256 verification are used. The server operator must set <code>CHROMAPLEX_AGENT_VERIFY_ROOTS</code>. This does not verify publisher identity.</p>
  </>:<>
   <div className="field"><label htmlFor="agent-target">Target-aware policy</label><select id="agent-target" value={target} onChange={e=>setTarget(e.target.value)}>{(status?.targets||defaults).map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></div>
   <div className="field"><label htmlFor="agent-filename">Source filename</label><input id="agent-filename" value={filename} maxLength={100} onChange={e=>setFilename(e.target.value)}/></div>
   <div className="field"><label htmlFor="agent-lang">Language</label><input id="agent-lang" value={language} onChange={e=>setLanguage(e.target.value.slice(0,40))}/></div>
   <div className="field"><label htmlFor="agent-source">Untrusted source (up to 12 KB UTF-8)</label><textarea id="agent-source" rows={12} spellCheck={false} value={source} onChange={e=>setSource(e.target.value)} placeholder="Paste source code from AI Studio or enter your own code…"/></div>
   <p className="muted">{kind==='review'?'Diagnostic source and memory-safety analysis only. A PASS here is not authorization to build or deploy.':'Calls the Coding Agent’s own preflight_sources() with mandatory ClamAV; fails closed if the scanner or dependencies are missing. A passing preflight is NOT a complete secure binary build.'}</p>
  </>}
  <button className="primary" type="button" onClick={()=>void run()} disabled={!yes||busy||(kind==='verify'?!artifact.trim():!source.trim()||new TextEncoder().encode(source).length>12000)}>{busy?'Checking…':kind==='review'?'Inspect source safely':kind==='preflight'?'Run mandatory security preflight':'Verify SHA-256 and security manifest'}</button>
  {error&&<div role="alert" className="alert danger">{error}</div>}
  {report&&<section className="column"><div className={report.ok?'alert':'alert danger'} role="status"><strong>{report.ok?'CHECK COMPLETED':'BLOCKED / NOT VERIFIED'}</strong> — {report.notice||report.error||'No validated results'}.</div>
   {report.staticAnalysis&&<><h3>Static safety: {report.staticAnalysis.state}</h3>{report.staticAnalysis.findings.map((f,i)=><p key={i}>{f.level} · {f.rule}: {f.detail}</p>)}</>}
   {report.memorySafety&&<><h3>Memory safety: {report.memorySafety.state}</h3>{report.memorySafety.findings.map((f,i)=><p key={i}>{f.level} · {f.rule}: {f.detail}</p>)}</>}
   {report.malwareScan&&<p>ClamAV preflight: {report.malwareScan}</p>}
   {report.sourceHashes&&<pre className="log">{JSON.stringify(report.sourceHashes,null,2)}</pre>}
   {report.problems&&report.problems.map((p,i)=><p key={i}>{p}</p>)}
   {report.verified!==undefined&&<p>Security manifest verification: <strong>{report.verified?'PASS':'FAIL'}</strong></p>}
  </section>}
  <p className="muted">For a fully verified build, quarantine compilation, binary malware scan and sealed release, use the standalone Coding Agent’s official Secure Compile Gate. For ChromaLinux, install its .deb independently through ChromaPress.</p>
 </div>;
}
