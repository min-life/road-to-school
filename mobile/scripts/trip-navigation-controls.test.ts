import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { Script } from 'node:vm';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { colors } from '../constants/theme.ts';

const require = createRequire(import.meta.url);
function loadComponent(file: string) {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports: Record<string, any> = {};
  new Script(compiled).runInNewContext({
    exports,
    require: (id: string) => id === 'react-native' ? require('react-native-web')
      : id === '../constants/theme' ? { colors } : require(id),
  });
  return exports;
}
const { TripNavigationControls } = loadComponent('../components/trip-navigation-controls.tsx');
const { TripNextStopSummary } = loadComponent('../components/trip-next-stop-summary.tsx');

describe('Navigation guidance presentation', () => {
  it('capitalizes retained guidance at render time without changing its text or distance', () => {
    for (const [text, expected] of [
      ['chặng dừng chân 1', 'Chặng dừng chân 1'],
      ['rẽ trái vào Đường Số 4', 'Rẽ trái vào Đường Số 4'],
      ['đi thẳng', 'Đi thẳng'],
      ['đến điểm dừng', 'Đến điểm dừng'],
      ['Rẽ phải vào Đường Số 4', 'Rẽ phải vào Đường Số 4'],
    ]) {
      const guidance = { text, streetName: '', metres: 128 };
      const html = renderToStaticMarkup(createElement(TripNavigationControls, {
        canPublish: false, testMode: false, mode: null, message: null,
        guidance, change: async () => {},
      }));
      const renderedText = html.replace(/<[^>]*>/g, '');
      assert.ok(renderedText.includes(`${expected} · 128 m`), renderedText);
      assert.deepEqual(guidance, { text, streetName: '', metres: 128 });
    }
  });
});

describe('Collapsed next-stop summary presentation', () => {
  const render = (estimate: { metres: number; seconds: number } | null) =>
    renderToStaticMarkup(createElement(TripNextStopSummary, { estimate })).replace(/<[^>]*>/g, '');
  it('shows minutes and distance to the next stop', () => {
    assert.ok(render({ metres: 850, seconds: 150 }).includes('3 phút · 850 m'));
    assert.ok(render({ metres: 1200, seconds: 60 }).includes('1 phút · 1,2 km'));
  });
  it('does not claim arrival while a positive distance remains', () => {
    assert.ok(render({ metres: 3, seconds: 0 }).includes('1 phút · 3 m'));
    assert.ok(render({ metres: 0, seconds: 0 }).includes('Đã đến · 0 m'));
  });
  it('shows unavailable text instead of invented estimates', () => {
    const text = render(null);
    assert.ok(text.includes('Chưa có ước tính'));
    assert.ok(text.includes('Đến điểm tiếp theo'));
    assert.equal(text.includes('0 m'), false);
    assert.equal(text.includes('phút'), false);
  });
});
