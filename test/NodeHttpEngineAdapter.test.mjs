import test from 'node:test';
import assert from 'node:assert/strict';

import {
  Quilt,
  NodeHttpEngineAdapter,
  QuiltResponse,
  createHandler,
  registerRouters,
} from '../dist/index.js';

test('NodeHttpEngineAdapter handles GET + query', async () => {
  const adapter = new NodeHttpEngineAdapter();
  const quilt = new Quilt(adapter);

  const helloHandler = createHandler({
    execute: async (req) => {
      return { message: `hi ${req.query.name ?? 'world'}` };
    },
  });

  quilt.get('/hello', helloHandler);

  await new Promise((resolve) => {
    adapter.listen(0, resolve);
  });

  const port = adapter.getPort();
  assert.ok(typeof port === 'number');

  const res = await fetch(`http://localhost:${port}/hello?name=Quilt`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.deepEqual(json, { message: 'hi Quilt' });

  await adapter.close();
});

test('NodeHttpEngineAdapter maps params and body for POST', async () => {
  const adapter = new NodeHttpEngineAdapter();
  const quilt = new Quilt(adapter);

  const echoHandler = createHandler({
    execute: async (req) => {
      return {
        id: req.params.id,
        body: req.body,
      };
    },
  });

  quilt.post('/users/:id', echoHandler);

  await new Promise((resolve) => {
    adapter.listen(0, resolve);
  });

  const port = adapter.getPort();
  assert.ok(typeof port === 'number');

  const res = await fetch(`http://localhost:${port}/users/123`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Quilt' }),
  });

  assert.equal(res.status, 200);
  const json = await res.json();
  assert.deepEqual(json, { id: '123', body: { name: 'Quilt' } });

  await adapter.close();
});

test('NodeHttpEngineAdapter respects Quilt error handler', async () => {
  const adapter = new NodeHttpEngineAdapter();
  const quilt = new Quilt(adapter);

  const failingHandler = createHandler({
    execute: async () => {
      throw new Error('boom');
    },
  });

  quilt.setErrorHandler((error) => {
    return new QuiltResponse({
      status: 500,
      body: { error: error.message },
    });
  });

  quilt.get('/fail', failingHandler);

  await new Promise((resolve) => {
    adapter.listen(0, resolve);
  });

  const port = adapter.getPort();
  assert.ok(typeof port === 'number');

  const res = await fetch(`http://localhost:${port}/fail`);
  assert.equal(res.status, 500);
  const json = await res.json();
  assert.deepEqual(json, { error: 'boom' });

  await adapter.close();
});

test('NodeHttpEngineAdapter works with registerRouters', async () => {
  const adapter = new NodeHttpEngineAdapter();
  const quilt = new Quilt(adapter);

  const statusHandler = createHandler({
    execute: async () => {
      return { ok: true };
    },
  });

  const router = {
    prefix: '',
    getRoutes() {
      return [
        {
          method: 'GET',
          path: '/status',
          handler: statusHandler,
        },
      ];
    },
  };

  registerRouters(quilt, router);

  await new Promise((resolve) => {
    adapter.listen(0, resolve);
  });

  const port = adapter.getPort();
  assert.ok(typeof port === 'number');

  const res = await fetch(`http://localhost:${port}/status`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.deepEqual(json, { ok: true });

  await adapter.close();
});

test('NodeHttpEngineAdapter supports OPTIONS and HEAD', async () => {
  const adapter = new NodeHttpEngineAdapter();
  const quilt = new Quilt(adapter);

  const optionsHandler = createHandler({
    execute: async () => {
      return { allow: 'GET,OPTIONS,HEAD' };
    },
  });

  const headHandler = createHandler({
    execute: async () => {
      return { ok: true };
    },
  });

  quilt.options('/resource', optionsHandler);
  quilt.head('/resource', headHandler);

  await new Promise((resolve) => {
    adapter.listen(0, resolve);
  });

  const port = adapter.getPort();
  assert.ok(typeof port === 'number');

  const resOptions = await fetch(`http://localhost:${port}/resource`, {
    method: 'OPTIONS',
  });
  const jsonOptions = await resOptions.json();
  assert.equal(resOptions.status, 200);
  assert.deepEqual(jsonOptions, { allow: 'GET,OPTIONS,HEAD' });

  const resHead = await fetch(`http://localhost:${port}/resource`, {
    method: 'HEAD',
  });
  assert.equal(resHead.status, 200);

  await adapter.close();
});

test('NodeHttpEngineAdapter applies QuiltResponse headers and contentType', async () => {
  const adapter = new NodeHttpEngineAdapter();
  const quilt = new Quilt(adapter);

  const handler = createHandler({
    execute: async () => {
      return new QuiltResponse({
        status: 201,
        body: 'ok',
        headers: { 'x-quilt': 'node-http' },
        contentType: 'text/plain',
      });
    },
  });

  quilt.get('/headers', handler);

  await new Promise((resolve) => {
    adapter.listen(0, resolve);
  });

  const port = adapter.getPort();
  assert.ok(typeof port === 'number');

  const res = await fetch(`http://localhost:${port}/headers`);
  assert.equal(res.status, 201);
  assert.equal(res.headers.get('x-quilt'), 'node-http');
  const contentType = res.headers.get('content-type') ?? '';
  assert.ok(contentType.includes('text/plain'));
  const text = await res.text();
  assert.equal(text.trim(), 'ok');

  await adapter.close();
});
