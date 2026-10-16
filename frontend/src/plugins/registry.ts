import type {PluginManifest,PluginCapability,PluginCategory} from './types';
class PluginRegistry {
  private plugins = new Map<string,PluginManifest>();
  private caps = new Map<string,PluginCapability>();
  register(manifest:PluginManifest):void {if(this.plugins.has(manifest.id))throw new Error('Duplicate plugin '+manifest.id);this.plugins.set(manifest.id,manifest);for(const cap of manifest.capabilities){this.caps.set(`${manifest.id}.${cap.id}`,cap);}}
  getPlugin(id:string):PluginManifest|undefined{return this.plugins.get(id);}
  getCapability(key:string):PluginCapability|undefined{return this.caps.get(key);}
  getAllPlugins():PluginManifest[]{return [...this.plugins.values()];}
  getPluginsByCategory(category:PluginCategory):PluginManifest[]{return this.getAllPlugins().filter(p=>p.category===category);}
}
export const pluginRegistry=new PluginRegistry();
