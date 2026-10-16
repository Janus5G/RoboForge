import {lazy} from 'react';
import type {PluginManifest} from '../types';
export const reaPlugin:PluginManifest={
 id:'rea',name:'REA Analysis',version:'0.1.0',icon:'🔎',category:'experimental',experimental:true,
 description:'Optional local reverse-engineering Evidence via the official REA CLI. Explicit authorization required.',
 capabilities:[
  {id:'static-analysis',label:'Static Analysis',component:lazy(()=>import('./ReaPanel'))},
  {id:'cli-status',label:'CLI Status',component:lazy(()=>import('./ReaStatus'))}
 ]
};
