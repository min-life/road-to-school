// Run from api/: npm run build, then node src/iot/verification/verify-readonly.mjs.
// This isolated server has no database connection, scheduled jobs or business data.
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AuthGuard } from '../../../dist/auth/auth.guard.js';
import { RolesGuard } from '../../../dist/auth/roles.guard.js';
import { IotDeviceGuard } from '../../../dist/iot/security/iot-device.guard.js';
import { IotSecretsService } from '../../../dist/iot/security/iot-secrets.service.js';
import { IotDevicesController } from '../../../dist/iot/devices/iot-devices.controller.js';
import { IotDevicesService } from '../../../dist/iot/devices/iot-devices.service.js';
import { IotScansController } from '../../../dist/iot/scans/iot-scans.controller.js';
import { IotScansService } from '../../../dist/iot/scans/iot-scans.service.js';
import { IotWifiController } from '../../../dist/iot/wifi/iot-wifi.controller.js';
import { IotWifiService } from '../../../dist/iot/wifi/iot-wifi.service.js';
import { IotFirmwareController } from '../../../dist/iot/firmware/iot-firmware.controller.js';
import { IotScansGateway } from '../../../dist/iot/realtime/iot-scans.gateway.js';
import { IotAssignmentsController } from '../../../dist/iot/assignments/iot-assignments.controller.js';
import { IotAssignmentsService } from '../../../dist/iot/assignments/iot-assignments.service.js';
import { IotRuntimeController } from '../../../dist/iot/assignments/iot-runtime.controller.js';
import { IotRuntimeService } from '../../../dist/iot/assignments/iot-runtime.service.js';

let databaseAccesses = 0;
const noDb = new Proxy({}, {
  get() { databaseAccesses++; throw new Error('Database access is forbidden'); },
});
const config = new ConfigService({});
const auth = new AuthGuard(new JwtService(), config, noDb);
const roles = new RolesGuard(new Reflector());
const secrets = new IotSecretsService(config);
const module = await Test.createTestingModule({
  controllers: [IotDevicesController, IotScansController, IotWifiController, IotFirmwareController, IotAssignmentsController, IotRuntimeController],
  providers: [
    { provide: ConfigService, useValue: config },
    { provide: AuthGuard, useValue: auth },
    { provide: IotDevicesService, useValue: new IotDevicesService(noDb, secrets, config, noDb) },
    { provide: IotScansService, useValue: new IotScansService(noDb, noDb, null, noDb) },
    { provide: IotWifiService, useValue: new IotWifiService(noDb, noDb, secrets) },
    { provide: IotAssignmentsService, useValue: {
      current: () => noDb.current(), history: () => noDb.history(), change: () => noDb.change(),
    } },
    { provide: IotRuntimeService, useValue: { config: () => noDb.config(), heartbeat: () => noDb.heartbeat() } },
    IotScansGateway,
  ],
}).overrideGuard(AuthGuard).useValue(auth)
  .overrideGuard(RolesGuard).useValue(roles)
  .overrideGuard(IotDeviceGuard).useValue(new IotDeviceGuard(secrets)).compile();
const app = module.createNestApplication({ logger: false });
app.setGlobalPrefix('api/v1');
const port = Number(process.env.IOT_VERIFY_PORT ?? 3000);

async function verifySocketAuth() {
  const socket = new WebSocket(`ws://127.0.0.1:${port}/socket.io/?EIO=4&transport=websocket`);
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Socket.IO auth timeout')), 5000);
      socket.addEventListener('error', () => {
        clearTimeout(timeout); reject(new Error('Socket connection error'));
      });
      socket.addEventListener('message', ({ data }) => {
        const message = String(data);
        if (message.startsWith('0')) socket.send('40/iot,{}');
        if (message.startsWith('44/iot,')) {
          clearTimeout(timeout);
          try { assert.match(message, /Unauthorized/); resolve(); }
          catch (error) { reject(error); }
        }
        if (message.startsWith('40/iot,')) {
          clearTimeout(timeout); reject(new Error('Unauthenticated IoT namespace was accepted'));
        }
      });
    });
  } finally { socket.close(); }
}

try {
  const document = SwaggerModule.createDocument(app, new DocumentBuilder()
    .setTitle('IoT read-only isolated verification').setVersion('1')
    .addBearerAuth({ type: 'http', scheme: 'bearer' }, 'JWT-auth').build());
  SwaggerModule.setup('api/docs', app, document);
  await app.listen(port, '127.0.0.1');
  const ui = await fetch(`http://localhost:${port}/api/docs`);
  assert.equal(ui.status, 200);
  assert.match(await ui.text(), /swagger-ui/);
  const jsonResponse = await fetch(`http://localhost:${port}/api/docs-json`);
  assert.equal(jsonResponse.status, 200);
  const spec = await jsonResponse.json();
  const expected = {
    '/api/v1/iot/devices/register': ['post'],
    '/api/v1/iot/devices/provision': ['post'],
    '/api/v1/iot/devices': ['get'],
    '/api/v1/iot/scans': ['get', 'post'],
    '/api/v1/iot/wifi/save': ['post'],
    '/api/v1/iot/firmware/latest.bin': ['get'],
    '/api/v1/iot/devices/{deviceId}/vehicle-assignment': ['get', 'put', 'delete'],
    '/api/v1/iot/devices/{deviceId}/vehicle-assignments': ['get'],
    '/api/v1/iot/devices/{deviceId}/runtime-config': ['get'],
    '/api/v1/iot/devices/{deviceId}/heartbeat': ['post'],
  };
  for (const [path, methods] of Object.entries(expected)) {
    for (const method of methods) {
      const operation = spec.paths[path]?.[method];
      assert.ok(operation, `${method} ${path}`);
      assert.ok(operation.responses['401']);
      assert.ok(operation.responses['503']);
      if (method === 'post') assert.ok(operation.requestBody?.content?.['application/json']?.schema);
    }
  }
  const scanOp = spec.paths['/api/v1/iot/scans'].post;
  assert.ok(scanOp.parameters.some((p) => p.name === 'X-IoT-Device-Key' && p.required));
  assert.equal(scanOp.security, undefined);
  assert.equal(spec.components.schemas.SaveIotWifiDto.properties.password.writeOnly, true);
  assert.ok(spec.paths['/api/v1/iot/scans'].get.parameters.some((p) => p.name === 'page'));
  assert.ok(spec.paths['/api/v1/iot/scans'].get.parameters.some((p) => p.name === 'vehicleId'));
  const binding = spec.paths['/api/v1/iot/devices/{deviceId}/vehicle-assignment'];
  assert.ok(binding.put.responses['409']);
  assert.ok(binding.put.requestBody);
  assert.ok(binding.delete.requestBody);
  assert.ok(spec.components.schemas.AssignIotVehicleDto.required.includes('expectedAssignmentId'));
  assert.equal(spec.components.schemas.AssignIotVehicleDto.properties.expectedAssignmentId.nullable, true);
  const runtime = spec.paths['/api/v1/iot/devices/{deviceId}/runtime-config'].get;
  assert.equal(runtime.security, undefined);
  assert.ok(runtime.parameters.some(p => p.name === 'X-IoT-Device-Key' && p.required));
  assert.deepEqual(Reflect.getMetadata('roles', IotAssignmentsController), ['SYSTEM_ADMIN']);
  for (const path of ['/iot/devices', '/iot/scans', '/iot/firmware/latest.bin',
    '/iot/devices/ESP32_000000000000/vehicle-assignment', '/iot/devices/ESP32_000000000000/vehicle-assignments',
    '/iot/devices/ESP32_000000000000/runtime-config']) {
    const response = await fetch(`http://localhost:${port}/api/v1${path}`);
    assert.equal(response.status, 401);
  }
  await verifySocketAuth();
  assert.equal(databaseAccesses, 0);
  const provisioning = spec.paths['/api/v1/iot/devices/provision'].post;
  assert.ok(provisioning.responses['200']);
  assert.ok(provisioning.responses['409']);
  assert.ok(provisioning.security.some(scheme => 'JWT-auth' in scheme));
  assert.ok(spec.components.schemas.ProvisionedIotDeviceResponseDto.properties.backendUrl);
  console.log(`PASS: Swagger UI /api/docs and /api/docs-json on localhost:${port}; IoT endpoint contracts, nullable CAS, runtime headers, scan filters and SYSADMIN metadata.`);
  console.log('PASS: missing-auth GETs return 401; Socket.IO /iot rejects unauthenticated connection.');
  console.log('PASS: zero database accesses; no POST/PUT/PATCH/DELETE requests; no business fixtures.');
} finally { await app.close(); }
