import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLesson, parseLessons, safeUrl } from '../public/model.js';
test('imports a single lesson, wrapped collection, array and fenced chat output',()=>{
  const lesson={title:'Learning motion',category:'Motion & 3D',actions:['Build a transition']};
  for(const value of [lesson,[lesson],{lessons:[lesson]}])assert.equal(parseLessons(JSON.stringify(value))[0].title,lesson.title);
  assert.equal(parseLessons('```json\n'+JSON.stringify(lesson)+'\n```').length,1);
});
test('rejects unsafe links, empty data and malformed JSON',()=>{
  assert.throws(()=>normalizeLesson({title:'x',sourceUrl:'javascript:alert(1)'}));
  assert.equal(safeUrl('data:text/html,test'),'');
  for(const value of ['[]','{}','not json','null'])assert.throws(()=>parseLessons(value));
});
test('bounds untrusted text and sanitizes list types',()=>{
  const l=normalizeLesson({title:'x'.repeat(300),category:'invalid',actions:[{},' Try it ',null]});
  assert.equal(l.title.length,180);assert.equal(l.category,'Codex & AI');assert.deepEqual(l.actions,['Try it']);
});
