// Read-only interoperability check; requires the existing api build and Node TS stripping.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { validateEsp32Image } from '../../../web/src/app/admin/iot/_components/iot-protocol.ts';
import { IotFirmwareController } from '../../../api/dist/iot/firmware/iot-firmware.controller.js';

const require = createRequire(new URL('../../../api/package.json', import.meta.url));
const { ConfigService } = await import(pathToFileURL(require.resolve('@nestjs/config')).href);
const work = resolve(process.argv[2] || 'E:/ChatGPT/road-to-school-iot');
const path = resolve(work, 'artifacts/firmware.bin');
const binary = await fs.readFile(path);
const manifest = JSON.parse(await fs.readFile(resolve(work, 'artifacts/firmware-manifest.json'), 'utf8'));
assert.equal(createHash('sha256').update(binary).digest('hex'), manifest.sha256);
assert.equal(binary.length, manifest.size);
validateEsp32Image(binary);
for (const [file, hash] of Object.entries(manifest.sourceHashes)) {
  const source = await fs.readFile(new URL(`../${file}`, import.meta.url));
  assert.equal(createHash('sha256').update(source).digest('hex'), hash, file);
}
const response = await new IotFirmwareController(new ConfigService({ IOT_FIRMWARE_PATH: path })).latest();
const chunks = [];
for await (const chunk of response.getStream()) chunks.push(Buffer.from(chunk));
assert.deepEqual(Buffer.concat(chunks), binary);
assert.equal(response.getHeaders().type, 'application/octet-stream');
console.log('PASS: compiled artifact passes the Web image validator and source/manifest SHA-256 checks.');
console.log('PASS: existing Backend controller serves exactly that file by direct read-only invocation.');
console.log('No server, USB access, HTTP mutation, authentication override or database connection was used.');
