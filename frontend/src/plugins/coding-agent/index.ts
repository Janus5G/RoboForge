import {lazy} from 'react';
import type {PluginManifest} from '../types';
export const codingAgentPlugin:PluginManifest={id:'coding-agent',name:'ChromaPlex Coding Agent',version:'0.4.1',description:'Optional trusted Linux Coding Agent bridge: target-aware source review, fail-closed security preflight and independent build verification.',icon:'⌘',category:'experimental',experimental:true,capabilities:[
{id:'source-review',label:'Review source',component:lazy(()=>import('./Review'))},
{id:'secure-preflight',label:'Secure preflight',component:lazy(()=>import('./Preflight'))},
{id:'verify-build',label:'Verify build',component:lazy(()=>import('./Verify'))}
]};
