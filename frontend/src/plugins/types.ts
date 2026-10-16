import type { ComponentType, LazyExoticComponent } from 'react';
export type PluginCategory='production'|'experimental';
export interface PluginComponentProps {config:Record<string,unknown>;onConfigChange:(config:Record<string,unknown>)=>void;}
export interface PluginCapability {id:string;label:string;component:ComponentType<PluginComponentProps>|LazyExoticComponent<ComponentType<PluginComponentProps>>;}
export interface PluginManifest {id:string;name:string;version:string;description:string;icon:string;category:PluginCategory;experimental?:boolean;capabilities:PluginCapability[];}
export interface GenerateResult {code:string;files:{path:string;lines:number;content:string}[];technologies:string[];integrationGuide:string;provider:string;model:string;}
export interface AISettings {provider:string;model:string;apiKey:string;}
