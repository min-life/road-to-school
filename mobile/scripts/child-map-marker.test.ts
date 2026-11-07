import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Script } from 'node:vm';
import { childMapPinScript, serializeMapScriptValue } from '../utils/child-map-marker.ts';

// Untrusted text/URL primitives only; no Student/Trip fixtures or API mocks.
describe('WebView marker script boundaries', () => {
  it('keeps closing-script text inert while preserving its original value', () => {
    const input = '</script><script>alert("text")</script>';
    const encoded = serializeMapScriptValue(input);
    assert.equal(encoded.includes('<'), false);
    assert.equal(JSON.parse(encoded), input);
    assert.equal(new Script(encoded).runInNewContext(), input);
  });
  it('round-trips quotes, backslashes, Vietnamese text and JavaScript line separators', () => {
    for (const input of ['"\\', 'Đông', '\u2028\u2029', 'https://example.invalid/image?a=1&b="x"']) {
      const encoded = serializeMapScriptValue(input);
      assert.equal(JSON.parse(encoded), input);
      assert.equal(new Script(encoded).runInNewContext(), input);
    }
    assert.equal(serializeMapScriptValue(undefined), 'null');
  });
  it('produces valid JavaScript for the WebView without requiring a map or database', () => {
    assert.doesNotThrow(() => new Script(childMapPinScript));
  });
});
