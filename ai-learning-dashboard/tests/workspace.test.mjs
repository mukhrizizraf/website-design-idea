// Exercise storage failures and background updates without a browser or network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as model from '../public/model.js';
import '../scripts/bundle.mjs';
const source=(await readFile(new URL('../public/app.js',import.meta.url),'utf8')).replace(/^import .*?;\s*/,'');
const bundledSource=await readFile(new URL('../public/dashboard.js',import.meta.url),'utf8');
function workspace(bundle=false){
  const nodes=new Map();const handlers=new Map();let failStorage=false;
  const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',hidden:true,open:false,classList:{add(){},remove(){},toggle(){}},addEventListener(){},focus(){this.focused=true;}});return nodes.get(id);};
  const session=new Map();
  const context={...model,URL,Blob,Date,JSON,Set,Number,String,Boolean,Array,Error,crypto,AbortSignal,
    document:{querySelector:node,getElementById:id=>node('#'+id),addEventListener:(name,handler)=>handlers.set(name,handler)},
    localStorage:{getItem:()=>null,setItem:()=>{if(failStorage)throw Error('Quota exceeded');}},
    sessionStorage:{getItem:k=>session.get(k),setItem:(k,v)=>session.set(k,v)},
    location:{hash:'',origin:'http://127.0.0.1:4173'},window:{addEventListener(){},scrollTo(){}},
    setTimeout:()=>1,clearTimeout(){},setInterval(){},
    fetch:async()=>({ok:true,json:async()=>({lessons:[{id:'incoming-1',title:'Incoming lesson',category:'Writing',createdAt:new Date().toISOString()}]})})
  };
  vm.createContext(context);
  vm.runInContext(bundle?bundledSource:source+`;globalThis.testing={persist,toast,sync,setRoute:v=>route=v,getState:()=>state};`,context);
  return {node,handlers,session,api:context.testing,setFailure:v=>failStorage=v};
}
test('the directly opened page uses a classic bundle that renders navigation and dashboard content',async()=>{
  const html=await readFile(new URL('../public/legacy.html',import.meta.url),'utf8');
  assert.match(html,/<script defer src="\.\/dashboard\.js"><\/script>/);
  assert.doesNotMatch(bundledSource,/^import |^export /m);
  const w=workspace(true);
  assert.match(w.node('#navigation').innerHTML,/Skill library/);
  assert.match(w.node('#main').innerHTML,/A little better, every day/);
  assert.match(w.node('#main').innerHTML,/Design with intention/);
});
test('storage failure remains visible despite later success messaging and retry clears warning',()=>{
  const w=workspace();w.setFailure(true);assert.equal(w.api.persist(),false);w.api.toast('Lesson saved.');
  assert.equal(w.node('#storage-warning').hidden,false);assert.match(w.node('#toast').textContent,/not saved/);
  w.setFailure(false);assert.equal(w.api.persist(),true);assert.equal(w.node('#storage-warning').hidden,true);
  w.api.toast('Workspace saved successfully.');assert.match(w.node('#toast').textContent,/successfully/);
});
test('background lesson delivery preserves the rendered form and deduplicates subsequent polls',async()=>{
  const w=workspace();w.api.setRoute('progress');w.node('#main').innerHTML='unfinished journal form';
  w.session.set('practice-token','test-token');w.session.set('practice-server','http://127.0.0.1:4173');
  await w.api.sync();assert.equal(w.node('#main').innerHTML,'unfinished journal form');assert.equal(w.api.getState().lessons.length,1);
  await w.api.sync();assert.equal(w.api.getState().lessons.length,1);
});
test('skip link focuses content without changing the active route',async()=>{
  const w=workspace();w.api.setRoute('skills');let prevented=false;
  await w.handlers.get('click')({target:{closest:s=>s==='.skip'?{}:null},preventDefault(){prevented=true;}});
  assert.equal(prevented,true);assert.equal(w.node('#main').focused,true);
});
