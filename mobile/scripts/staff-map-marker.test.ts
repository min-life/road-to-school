import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Script } from 'node:vm';
import { childMapPinScript, mapPinSvg } from '../utils/child-map-marker';

// Minimal DOM presentation only; no Student/Trip records, locations or API mocks.
type PresentationElement = {
  tag: string; className: string; innerHTML: string; textContent: string;
  attributes: Record<string, string>; children: PresentationElement[];
  style: Record<string, string>;
  setAttribute: (key: string, value: string) => void;
  appendChild: (child: PresentationElement) => void;
};

function markerFactory() {
  const scope = {
    window: {} as { createChildMapPin: (id: null, name: string) => PresentationElement },
    document: { createElement: element },
  };
  function element(tag: string): PresentationElement {
    return { tag, className: '', innerHTML: '', textContent: '', attributes: {} as Record<string, string>,
      children: [], style: {},
      setAttribute(key: string, value: string) { this.attributes[key] = value; },
      appendChild(child: PresentationElement) { this.children.push(child); },
    };
  }
  new Script(childMapPinScript).runInNewContext(scope);
  return (name: string) => scope.window.createChildMapPin(null, name);
}

describe('Staff pins reuse the unchanged Parent pin frame', () => {
  it('uses the Parent renderer and frame for a staff name initial', () => {
    const root = markerFactory()('a');
    assert.equal(root.className, 'child-map-pin');
    assert.equal(root.innerHTML, mapPinSvg);
    assert.equal(root.attributes['aria-hidden'], 'true');
    assert.equal(root.children[0].className, 'child-map-pin-face');
    assert.equal(root.children[0].children[0].textContent, 'A');
  });
  it('uppercases Vietnamese initials exactly like Parent', () => {
    assert.equal(markerFactory()('đông').children[0].children[0].textContent, 'Đ');
    assert.equal(markerFactory()('nguyễn').children[0].children[0].textContent, 'N');
  });
  it('keeps the Parent fallback for an empty name', () => {
    assert.equal(markerFactory()('').children[0].children[0].textContent, 'H');
  });
  it('never puts stop labels into HTML', () => {
    const text = '</span><img src=x onerror=alert(1)>';
    const root = markerFactory()(text);
    assert.equal(root.innerHTML, mapPinSvg);
    assert.equal(root.children[0].children[0].innerHTML, '');
    assert.equal(root.children[0].children[0].textContent, '<');
  });
});
