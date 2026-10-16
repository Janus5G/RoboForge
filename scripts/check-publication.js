'use strict';
// Dependency-free repository publication checks; not a browser or production application test.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
function read(file){return fs.readFileSync(path.join(root,file),'utf8');}
function required(file){assert(fs.statSync(path.join(root,file)).isFile(),`Missing ${file}`);}
const files=['README.md','.gitignore','.env.example','SECURITY.md','CONTRIBUTING.md','CHANGELOG.md','.github/workflows/ci.yml','docs/index.html','docs/assets/site.css','docs/assets/site.js','docs/screenshots/overview-dark.png','docs/screenshots/overview-light.png','docs/GITHUB_RELEASE_CHECKLIST.md','LICENSE','docs/MCP_GATEWAY_HANDOVER.md','docs/CHROMANEURAL_MODULE9_PROMPT.md','THIRD_PARTY_NOTICES.md'];
for(const file of files)required(file);
const html=read('docs/index.html');
const attrs=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1]);
const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
for(const ref of attrs){
 if(ref.startsWith('#')){assert(ids.has(ref.substring(1)),`Missing section ${ref}`);continue;}
 if(/^(mailto:|https?:|data:)/.test(ref))continue;
 const resolved=path.resolve(root,'docs',decodeURI(ref.split(/[?#]/,1)[0]));
 assert(resolved.startsWith(path.join(root,'docs')+path.sep),`Unsafe relative reference: ${ref}`);
 assert(fs.existsSync(resolved),`Missing referenced asset ${ref}`);
}
const readme=read('README.md');
for(const ref of [...readme.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map(x=>x[1])) {
 if(/^(?:https?:|data:|\/\/)/i.test(ref)) continue;
 assert(fs.existsSync(path.resolve(root,ref)),`Missing README image ${ref}`);
}
assert(/static design previews/i.test(readme),'Preview provenance missing from README');
assert(/MIT License/i.test(readme),'MIT licensing section missing');
assert(/\[LICENSE\]\(LICENSE\)/.test(readme),'README must link to LICENSE');
assert(/^MIT License\s+Copyright \(c\) 2026 Janus5G/m.test(read('LICENSE')),'MIT license/copyright header missing');
new vm.Script(read('docs/assets/site.js'),{filename:'docs/assets/site.js'});
for(const word of ['#applications','#integrations','#ai','#getting-started','overview-dark.png']) assert(html.includes(word),`Missing use case reference ${word}`);
assert(read('docs/assets/site.js').includes('overview-${appearance}.png'), 'Theme preview switch missing');
console.log('PASS: required files, site local references, section anchors, screenshot references, JS syntax, preview and MIT license metadata.');
