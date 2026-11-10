import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { parseLessons } from '../public/model.js';

const data = await readFile(new URL('../public/skills.js', import.meta.url), 'utf8');
const source = await readFile(new URL('../public/showcase.js', import.meta.url), 'utf8');

function shelf() {
  const nodes = new Map();
  const handlers = new Map();
  let download;
  const node = selector => {
    if (!nodes.has(selector)) nodes.set(selector, {
      innerHTML: '', textContent: '', open: false,
      addEventListener() {}, showModal() { this.open = true; }
    });
    return nodes.get(selector);
  };
  const context = {
    window: { addEventListener() {} },
    document: {
      querySelector: node, querySelectorAll: () => [],
      addEventListener: (name, handler) => handlers.set(name, handler),
      createElement: () => ({ click() {} })
    },
    location: { hash: '#skill=prompt-motion-design-ideas' },
    localStorage: { getItem: () => null },
    Blob, URL: { createObjectURL: blob => { download = blob; return 'blob:test'; } },
    setTimeout: () => 1
  };
  vm.createContext(context);
  vm.runInContext(data, context);
  vm.runInContext(source, context);
  return {
    node,
    download() {
      handlers.get('click')({ target: { closest: () => ({ dataset: { downloadPack: 'prompt-motion-design-ideas' } }) } });
      return download;
    }
  };
}

test('Prompt Motion opens eight local summaries without links to the reported site', () => {
  const page = shelf();
  assert.equal(page.node('#detail').open, true);
  const html = page.node('#detail-body').innerHTML;
  assert.equal((html.match(/<details /g) || []).length, 8);
  assert.doesNotMatch(html, /href="https:\/\/(?:www\.)?prompt-motion\.com/);
  assert.match(html, /antivirus warning/i);
  assert.match(html, /Shape morphing through UI states/);
});

test('downloaded Prompt Motion lessons import without reintroducing the reported links', async () => {
  const lessons = parseLessons(await shelf().download().text());
  assert.equal(lessons.length, 8);
  for (const lesson of lessons) {
    assert.equal(lesson.sourceUrl, '');
    assert.match(lesson.source, /Prompt Motion/);
    assert.ok(lesson.summary && lesson.takeaways.length && lesson.actions.length);
  }
});
