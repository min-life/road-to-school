import { colors } from '../constants/theme';

// Teal silhouette follows the parent's supplied pin reference; other colors reuse the theme.
const pinBody = '#176B80';
export const childMapPinSize = { width: 24, height: 30 } as const;
const portraitSize = childMapPinSize.width * 0.75;

export const childMapPinCss = `
  .child-map-pin { position: relative; width: ${childMapPinSize.width}px; height: ${childMapPinSize.height}px; filter: drop-shadow(0 1px 2px rgba(23,36,59,.25)); }
  .child-map-pin::before { content: ''; position: absolute; width: 44px; height: 44px;
    left: ${(childMapPinSize.width - 44) / 2}px; top: ${(childMapPinSize.height - 44) / 2}px; }
  .child-map-pin svg { display: block; width: 100%; height: 100%; }
  .child-map-pin-face { position: absolute; left: ${(childMapPinSize.width - portraitSize) / 2}px;
    top: ${childMapPinSize.height * 26 / 66 - portraitSize / 2}px; width: ${portraitSize}px; height: ${portraitSize}px; border-radius: 50%;
    overflow: hidden; background: ${colors.background}; color: ${colors.foreground}; display: flex; align-items: center;
    justify-content: center; font-family: system-ui, sans-serif; font-size: 10px; font-weight: 800; }
  .child-map-pin-face img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .leaflet-marker-icon:focus-visible .child-map-pin { outline: 2px solid ${colors.foreground}; outline-offset: 3px; }
`;

/** Static DOM code runs inside the existing Leaflet WebView, not a second map engine. */
export const childMapPinScript = `
  (function() {
    var pins = [];
    function safeUrl(value) {
      try {
        var url = new URL(value);
        return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
      } catch (_) { return ''; }
    }
    function setPortrait(pin, portrait) {
      var name = portrait && portrait.fullName || pin.name || '';
      var fullName = name.replace(/\\s*\\(Con bạn\\)\\s*$/, '');
      pin.initial.textContent = (fullName || 'H').charAt(0).toUpperCase();
      var url = safeUrl(portrait && portrait.avatarUrl || '');
      if (url === pin.url && !pin.failed) return;
      pin.url = url;
      pin.failed = false;
      if (pin.image) { pin.image.remove(); pin.image = null; }
      pin.initial.style.visibility = 'visible';
      if (!url) return;
      var image = document.createElement('img');
      image.alt = '';
      image.decoding = 'async';
      image.referrerPolicy = 'no-referrer';
      image.style.display = 'none';
      image.onload = function() {
        if (pin.image !== image) return;
        pin.failed = false;
        image.style.display = 'block';
        pin.initial.style.visibility = 'hidden';
      };
      image.onerror = function() {
        if (pin.image !== image) return;
        pin.failed = true;
        image.style.display = 'none';
        pin.initial.style.visibility = 'visible';
      };
      pin.image = image;
      pin.face.appendChild(image);
      image.src = url;
    }
    window.createChildMapPin = function(studentId, name) {
      var root = document.createElement('div');
      root.className = 'child-map-pin';
      root.setAttribute('aria-hidden', 'true');
      root.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 66"><path d="M26 1C12.2 1 1 12.2 1 26c0 17.5 25 39 25 39s25-21.5 25-39C51 12.2 39.8 1 26 1Z" fill="${pinBody}" stroke="${colors.surface}" stroke-width="1.2"/><circle cx="26" cy="26" r="22" fill="${colors.surface}" stroke="${colors.foreground}" stroke-width=".6"/><circle cx="26" cy="26" r="20" fill="none" stroke="${colors.navigationActive}" stroke-width=".6"/></svg>';
      var face = document.createElement('div');
      face.className = 'child-map-pin-face';
      var initial = document.createElement('span');
      face.appendChild(initial);
      root.appendChild(face);
      var pin = { studentId: studentId, name: name, face: face, initial: initial, image: null, url: null, failed: false };
      setPortrait(pin, null);
      pins.push(pin);
      return root;
    };
    window.setChildMapAvatars = function(children) {
      var byId = new Map();
      children.forEach(function(child) { byId.set(child.id, child); });
      pins.forEach(function(pin) { setPortrait(pin, byId.get(pin.studentId)); });
    };
  })();
`;

/** Prevent text/URLs from terminating an inline script in the WebView document. */
export function serializeMapScriptValue(value: unknown): string {
  return (JSON.stringify(value) ?? 'null').replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}
