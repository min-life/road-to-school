import 'reflect-metadata';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';

vi.mock('./app.module.js', () => ({ AppModule: class {} }));

describe('HTTP entrypoint', () => {
  const request = {} as IncomingMessage;
  const listen = vi.fn();
  const listener = vi.fn();
  const init = vi.fn();
  const app = {
    setGlobalPrefix: vi.fn(),
    useGlobalPipes: vi.fn(),
    enableCors: vi.fn(),
    listen,
    init,
    getHttpAdapter: () => ({ getInstance: () => listener }),
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.spyOn(NestFactory, 'create').mockResolvedValue(app as never);
    vi.spyOn(SwaggerModule, 'createDocument').mockReturnValue({} as never);
    vi.spyOn(SwaggerModule, 'setup').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it('exports a handler and shares initialization across concurrent requests', async () => {
    const { default: handler } = await import('./main.js');
    const first = {} as ServerResponse;
    const second = {} as ServerResponse;

    expect(NestFactory.create).not.toHaveBeenCalled();
    await Promise.all([handler(request, first), handler(request, second)]);
    expect(init).toHaveBeenCalledTimes(1);
    expect(listen).not.toHaveBeenCalled();
    expect(listener).toHaveBeenNthCalledWith(1, request, first);
    expect(listener).toHaveBeenNthCalledWith(2, request, second);
  });

  it('returns a server error and retries initialization on a later request', async () => {
    init.mockRejectedValueOnce(new Error('Test startup failure'));
    const { default: handler } = await import('./main.js');
    const response = { writeHead: vi.fn(), end: vi.fn() };

    await handler(request, response as unknown as ServerResponse);
    expect(response.writeHead).toHaveBeenCalledWith(503, { 'Content-Type': 'application/json' });
    expect(listener).not.toHaveBeenCalled();

    await handler(request, response as unknown as ServerResponse);
    expect(init).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenCalledWith(request, response);
  });
});
