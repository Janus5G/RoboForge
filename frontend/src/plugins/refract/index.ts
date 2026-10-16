import {lazy} from 'react';
import type {PluginManifest} from '../types';
export const refractPlugin:PluginManifest={id:'refract',name:'Refract Studio',version:'0.4.0',description:'Optional standalone Refract compiler preview. No execution, no editor embedding.',icon:'◇',experimental:true,category:'experimental',capabilities:[{id:'compiler-preview',label:'CPL preview',component:lazy(()=>import('./RefractPanel'))}]};
