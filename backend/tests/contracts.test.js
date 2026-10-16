'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs'),path=require('node:path');
const {PLUGINS}=require('../plugins');
const root=path.resolve(__dirname,'../../frontend');
test('upstream plugin ids and capabilities retained in corrected app',()=>{
  const original=JSON.parse(fs.readFileSync(path.join(root,'plugins.json'),'utf8')).plugins;
  assert.equal(original.length,10);
  assert(PLUGINS.some(x=>x.id==='rea'),'REA registry entry absent');
  for(const p of original){const manifest=PLUGINS.find(x=>x.id===p.id);assert(manifest,'Missing plugin '+p.id);assert.deepEqual(manifest.capabilities,p.capabilities);}
});
test('frontend plugin component import files all exist',()=>{
  for(const p of PLUGINS){const mod=p.id==='siemens-xcelerator'?'siemens':p.id;const entry=path.join(root,'src/plugins',mod,'index.ts');assert(fs.existsSync(entry),entry);const content=fs.readFileSync(entry,'utf8');for(const cap of p.capabilities){assert(content.includes(`id:'${cap}'`),`Missing capability ${p.id}.${cap}`);}}
});
