import {lazy} from 'react';
import type {PluginManifest} from '../types';
export const janusPlugin:PluginManifest={id:'janus',name:'DeepSeek Janus',version:'0.4.0',description:'Optional multimodal AI module; local model runtime is not yet integrated.',icon:'◉',experimental:true,category:'experimental',capabilities:[{id:'runtime-status',label:'Runtime status',component:lazy(()=>import('./JanusPanel'))}]};
