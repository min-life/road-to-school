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
const source = readFileSync(new URL('../components/trip-navigation-controls.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exports: Record<string, any> = {};
new Script(compiled).runInNewContext({
  exports,
  require: (id: string) => id === 'react-native' ? require('react-native-web')
    : id === '../constants/theme' ? { colors } : require(id),
});

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
      const html = renderToStaticMarkup(createElement(exports.TripNavigationControls, {
        canPublish: false, testMode: false, mode: null, message: null,
        guidance, change: async () => {},
      }));
      const renderedText = html.replace(/<[^>]*>/g, '');
      assert.ok(renderedText.includes(`${expected} · 128 m`), renderedText);
      assert.deepEqual(guidance, { text, streetName: '', metres: 128 });
    }
  });
});
