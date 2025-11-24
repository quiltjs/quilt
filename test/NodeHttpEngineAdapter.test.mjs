import test from 'node:test';
import assert from 'node:assert/strict';

import {
  Quilt,
  NodeHttpEngineAdapter,
  createHandler,
  registerRouters,
} from '../dist/index.js';

test('NodeHttpEngineAdapter handles GET + query', async () => {
  const adapter = new NodeHttpEngineAdapter();
  const quilt = new Quilt(adapter);

  const helloHandler = createHandler({
    execute: async ({ req, res }) => {
      res.statusCode = 200;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ message: `hi ${req.query.name ?? 'world'}` }));
    },
  });

  quilt.get('/hello', helloHandler);

  await new Promise((resolve) => {
    adapter.listen(0, resolve);
  });

  const port = adapter.getPort();
  assert.ok(typeof port === 'number');

  try {
    const res = await fetch(`http://localhost:${port}/hello?name=Quilt`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.deepEqual(json, { message: 'hi Quilt' });
  } finally {
    await adapter.close();
  }
});

test('NodeHttpEngineAdapter maps params and body for POST', async () => {
  const adapter = new NodeHttpEngineAdapter();
  const quilt = new Quilt(adapter);

  const echoHandler = createHandler({
    execute: async ({ req, res }) => {
      res.statusCode = 200;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(
        JSON.stringify({
          id: req.params.id,
          body: req.body,
        }),
      );
    },
  });

  quilt.post('/users/:id', echoHandler);

  await new Promise((resolve) => {
    adapter.listen(0, resolve);
  });

  const port = adapter.getPort();
  assert.ok(typeof port === 'number');

  try {
    const res = await fetch(`http://localhost:${port}/users/123`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Quilt' }),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.deepEqual(json, { id: '123', body: { name: 'Quilt' } });
  } finally {
    await adapter.close();
  }
});

test('NodeHttpEngineAdapter respects Quilt error handler', async () => {
  const adapter = new NodeHttpEngineAdapter();
  const quilt = new Quilt(adapter);

  const failingHandler = createHandler({
    execute: async () => {
      throw new Error('boom');
    },
  });

  quilt.setErrorHandler((error, { res }) => {
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: error.message }));
  });

  quilt.get('/fail', failingHandler);

  await new Promise((resolve) => {
    adapter.listen(0, resolve);
  });

  const port = adapter.getPort();
  assert.ok(typeof port === 'number');

  try {
    const res = await fetch(`http://localhost:${port}/fail`);
    assert.equal(res.status, 500);
    const json = await res.json();
    assert.deepEqual(json, { error: 'boom' });
  } finally {
    await adapter.close();
  }
});

test('NodeHttpEngineAdapter works with registerRouters', async () => {
  const adapter = new NodeHttpEngineAdapter();
  const quilt = new Quilt(adapter);

  const statusHandler = createHandler({
    execute: async ({ res }) => {
      res.statusCode = 200;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ok: true }));
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

  try {
    const res = await fetch(`http://localhost:${port}/status`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.deepEqual(json, { ok: true });
  } finally {
    await adapter.close();
  }
});

test('NodeHttpEngineAdapter supports OPTIONS and HEAD', async () => {
  const adapter = new NodeHttpEngineAdapter();
  const quilt = new Quilt(adapter);

  const optionsHandler = createHandler({
    execute: async ({ res }) => {
      res.statusCode = 200;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ allow: 'GET,OPTIONS,HEAD' }));
    },
  });

  const headHandler = createHandler({
    execute: async ({ res }) => {
      res.statusCode = 200;
      res.end();
    },
  });

  quilt.options('/resource', optionsHandler);
  quilt.head('/resource', headHandler);

  await new Promise((resolve) => {
    adapter.listen(0, resolve);
  });

  const port = adapter.getPort();
  assert.ok(typeof port === 'number');

  try {
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
  } finally {
    await adapter.close();
  }
});

test('NodeHttpEngineAdapter applies QuiltResponse headers and contentType', async () => {
  const adapter = new NodeHttpEngineAdapter();
  const quilt = new Quilt(adapter);

  const handler = createHandler({
    execute: async ({ res }) => {
      res.statusCode = 201;
      res.setHeader('x-quilt', 'node-http');
      res.setHeader('content-type', 'text/plain; charset=utf-8');
      res.end('ok');
    },
  });

  quilt.get('/headers', handler);

  await new Promise((resolve) => {
    adapter.listen(0, resolve);
  });

  const port = adapter.getPort();
  assert.ok(typeof port === 'number');

  try {
    const res = await fetch(`http://localhost:${port}/headers`);
    assert.equal(res.status, 201);
    assert.equal(res.headers.get('x-quilt'), 'node-http');
    const contentType = res.headers.get('content-type') ?? '';
    assert.ok(contentType.includes('text/plain'));
    const text = await res.text();
    assert.equal(text.trim(), 'ok');
  } finally {
    await adapter.close();
  }
});
