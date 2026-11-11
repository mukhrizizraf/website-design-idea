import { cp, mkdir } from 'node:fs/promises';
await mkdir('dist',{recursive:true});
await cp('README.md','public/README.md');
await cp('public','dist',{recursive:true});
await cp('README.md','dist/README.md');
console.log('Static dashboard built in dist/. No secrets or private learning data are included.');
