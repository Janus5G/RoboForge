import type {PluginManifest} from '../plugins/types';
import {Icon} from './Icon';
export type View='generator'|'plugins'|'code'|'settings'|'overview';
interface Props {view:View;setView:(v:View)=>void;productionPlugins:PluginManifest[];experimentalPlugins:PluginManifest[];activePlugin:string;setActivePlugin:(id:string)=>void;onSearch:()=>void;mobileOpen:boolean;onClose:()=>void;}
const symbols:Record<string,'radio'|'factory'|'robot'|'plug'|'home'|'cpu'|'layers'|'code'|'terminal'>={'mqtt':'radio','opcua':'factory','ros2':'robot','arduino':'plug','home-assistant':'home','isaac-sim':'cpu','siemens-xcelerator':'layers','rea':'code','refract':'terminal','janus':'cpu','coding-agent':'code'};
export function pluginIcon(id:string){return symbols[id]||'layers';}
export function Sidebar({view,setView,productionPlugins,experimentalPlugins,activePlugin,setActivePlugin,onSearch,mobileOpen,onClose}:Props){
 function go(next:View,p?:string){if(p)setActivePlugin(p);setView(next);onClose();}
 function plugins(items:PluginManifest[]){return items.map(p=><button key={p.id} aria-current={view==='plugins'&&activePlugin===p.id?'page':undefined} className={'side-link '+(view==='plugins'&&activePlugin===p.id?'selected':'')} onClick={()=>go('plugins',p.id)}><Icon name={pluginIcon(p.id)} size={17}/><span>{p.name}</span>{p.category==='experimental'&&<span className="tiny-experimental" title="Experimental">E</span>}</button>);}
 return <><div className={'mobile-shade '+(mobileOpen?'visible':'')} onClick={onClose}/><aside className={'sidebar '+(mobileOpen?'show-mobile':'')}>
   <button className="brand" onClick={()=>go('overview')} aria-label="RoboForge overview"><span className="brand-mark"><Icon name="layers" size={22}/></span><span><strong>RoboForge<span className="brand-period">.</span></strong><small>INDUSTRIAL STUDIO</small></span></button>
   <div className="sidebar-content">
    <button className="side-search" onClick={()=>{onSearch();onClose();}}><Icon name="search" size={16}/><span>Search anything</span><kbd>⌘ K</kbd></button>
    <div className="side-group"><p className="side-label">WORKSPACE</p>
      <button className={'side-link '+(view==='overview'?'selected':'')} onClick={()=>go('overview')}><Icon name="dashboard" size={18}/>Overview</button>
      <button className={'side-link '+(view==='generator'?'selected':'')} onClick={()=>go('generator')}><Icon name="sparkles" size={18}/>AI Studio<span className="side-tiny">AI</span></button>
      <button className={'side-link '+(view==='code'?'selected':'')} onClick={()=>go('code')}><Icon name="terminal" size={18}/>Code Workspace</button>
      <button className={'side-link '+(view==='settings'?'selected':'')} onClick={()=>go('settings')}><Icon name="settings" size={18}/>Settings</button>
    </div>
    <div className="side-group"><p className="side-label">INDUSTRIAL CONNECTORS <span>{productionPlugins.length}</span></p>{plugins(productionPlugins)}</div>
    <div className="side-group"><p className="side-label">EXPERIMENTAL LAB <span>{experimentalPlugins.length}</span></p>{plugins(experimentalPlugins)}</div>
   </div>
   <div className="sidebar-bottom"><div className="sidebar-product"><span className="product-icon"><Icon name="shield" size={17}/></span><div><strong>Local-first security</strong><small>Human-authorized operations</small></div></div><div className="side-version"><span>RoboForge Studio</span><span>v0.4.1</span></div></div>
  </aside></>;
}
