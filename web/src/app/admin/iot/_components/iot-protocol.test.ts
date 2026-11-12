import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSerialReply, parseWifiNetworks, serialErrorMessage, validateDeviceApiUrl, validateEsp32Image } from './iot-protocol.ts';
import { Esp32Session } from './esp32-session.ts';

// Pure protocol/format tests only. No business records, API fixtures, USB access or firmware flashing.
test('serial parser ignores raw device logs and malformed frames', () => {
  for (const line of ['not JSON', 'null', '[]', '{}', '{"ok":"yes","requestId":1}', 'x'.repeat(8193)]) {
    assert.equal(parseSerialReply(line), null);
  }
});

test('serial parser discards unrecognized fields rather than exposing raw firmware output', () => {
  assert.deepEqual(parseSerialReply('{"requestId":"","ok":false,"rawOutput":"discard"}'), {
    requestId: '', ok: false, data: undefined,
  });
});

test('serial parser does not treat arrays as response data', () => {
  assert.equal(parseSerialReply('{"requestId":"","ok":false,"data":[]}')?.data, undefined);
});

test('device API URLs reject loopback, credentials, query, fragments and wrong base paths', () => {
  for (const url of ['http://localhost:3000/api/v1', 'http://127.0.0.1/api/v1', 'http://[::1]/api/v1',
    'http://0.0.0.0/api/v1', 'file:///api/v1', 'https://example.invalid/api',
    'https://example.invalid/api/v1?token=invalid', 'https://example.invalid/api/v1#fragment',
    'https://invalid:invalid@example.invalid/api/v1']) {
    assert.throws(() => validateDeviceApiUrl(url));
  }
});

test('device API URLs normalize the trailing slash without making network calls', () => {
  assert.equal(validateDeviceApiUrl('https://example.invalid/api/v1/'), 'https://example.invalid/api/v1');
});

test('empty or app-only firmware images cannot be flashed as a merged image', () => {
  assert.throws(() => validateEsp32Image(new Uint8Array()));
  const appOnly = new Uint8Array(0x11000);
  appOnly[0] = 0xe9;
  assert.throws(() => validateEsp32Image(appOnly));
});

test('images above the POC board size are rejected before touching USB', () => {
  assert.throws(() => validateEsp32Image(new Uint8Array(4 * 1024 * 1024 + 1)));
});

test('serial commands and flashing fail closed without an open connection', async () => {
  const session = new Esp32Session();
  await assert.rejects(session.command('INFO'));
  await assert.rejects(session.flash(new Uint8Array(), () => assert.fail('Unexpected flash progress')));
  await session.disconnect();
});

test('serial errors expose only known safe messages, never arbitrary firmware text', () => {
  assert.match(serialErrorMessage('WIFI_CONNECT_TIMEOUT'), /12 giây/);
  assert.match(serialErrorMessage('DEVICE_NOT_CONFIGURED'), /Thiết lập lại/);
  assert.match(serialErrorMessage('NVS_WRITE_FAILED'), /không lưu được/);
  assert.match(serialErrorMessage('UNKNOWN_COMMAND'), /firmware mới/);
  for (const code of ['untrusted-raw-device-text', '__proto__', 'toString', null, {}]) {
    assert.equal(serialErrorMessage(code), 'ESP32 báo lỗi chưa xác định. Kết nối lại thiết bị rồi thử lại.');
  }
});

test('Wi-Fi results must be bounded, typed, and contain valid SSIDs before selection', () => {
  assert.deepEqual(parseWifiNetworks({ networks: [] }), []);
  for (const data of [undefined, {}, { networks: {} }, { networks: Array(21).fill(null) },
    { networks: [null] }, { networks: [{}] }, { networks: [{ ssid: '\0' }] }]) {
    assert.throws(() => parseWifiNetworks(data));
  }
});
