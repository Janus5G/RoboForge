// Build-time automatic discovery of bundled plugin manifests.
// Vite only imports files shipped with RoboForge; never loads remote arbitrary code.
import {pluginRegistry} from './registry';
import type {PluginManifest} from './types';
const modules = import.meta.glob('./*/index.ts',{eager:true}) as Record<string,Record<string,unknown>>;
export function autoLoadPlugins():PluginManifest[] {
  for(const [path,exports] of Object.entries(modules).sort(([a],[b])=>a.localeCompare(b))){
    const candidates = Object.values(exports).filter((value):value is PluginManifest =>
      typeof value==='object' && value!==null && typeof (value as PluginManifest).id==='string' && Array.isArray((value as PluginManifest).capabilities));
    if(candidates.length!==1)throw new Error(`Expected one plugin manifest in ${path}`);
    pluginRegistry.register(candidates[0]);
  }
  return pluginRegistry.getAllPlugins();
}
