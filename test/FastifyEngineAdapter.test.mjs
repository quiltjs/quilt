import test from 'node:test';
import assert from 'node:assert/strict';
import fastify from 'fastify';

import {
  Quilt,
  FastifyEngineAdapter,
  createHandler,
  registerRouters,
} from '../dist/index.js';

test('FastifyEngineAdapter integrates Quilt with Fastify for GET + query', async () => {
  const app = fastify();

  const quilt = new Quilt(new FastifyEngineAdapter({ fastify: app }));

  const helloHandler = createHandler({
    execute: async ({ req, res }) => {
      res.code(200).send({ message: `hi ${req.query.name ?? 'world'}` });
    },
  });

  quilt.get('/hello', helloHandler);

  const address = await app.listen({ port: 0 });
  const url = new URL(address);

  try {
    const res = await fetch(`${url.origin}/hello?name=Quilt`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.deepEqual(json, { message: 'hi Quilt' });
  } finally {
    await app.close();
  }
});

test('FastifyEngineAdapter maps params and body for POST', async () => {
  const app = fastify();
  const quilt = new Quilt(new FastifyEngineAdapter({ fastify: app }));

  const echoHandler = createHandler({
    execute: async ({ req, res }) => {
      res.code(200).send({
        id: req.params.id,
        body: req.body,
      });
    },
  });

  quilt.post('/users/:id', echoHandler);

  const address = await app.listen({ port: 0 });
  const url = new URL(address);

  try {
    const res = await fetch(`${url.origin}/users/123`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Quilt' }),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.deepEqual(json, { id: '123', body: { name: 'Quilt' } });
  } finally {
    await app.close();
  }
});

test('FastifyEngineAdapter respects Quilt error handler', async () => {
  const app = fastify();
  const quilt = new Quilt(new FastifyEngineAdapter({ fastify: app }));

  const failingHandler = createHandler({
    execute: async () => {
      throw new Error('boom');
    },
  });

  quilt.setErrorHandler((error, { res }) => {
    res.code(500).send({ error: error.message });
  });

  quilt.get('/fail', failingHandler);

  const address = await app.listen({ port: 0 });
  const url = new URL(address);

  try {
    const res = await fetch(`${url.origin}/fail`);
    assert.equal(res.status, 500);
    const json = await res.json();
    assert.deepEqual(json, { error: 'boom' });
  } finally {
    await app.close();
  }
});

test('FastifyEngineAdapter works with registerRouters', async () => {
  const app = fastify();
  const quilt = new Quilt(new FastifyEngineAdapter({ fastify: app }));

  const statusHandler = createHandler({
    execute: async ({ res }) => {
      res.code(200).send({ ok: true });
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

  const address = await app.listen({ port: 0 });
  const url = new URL(address);

  try {
    const res = await fetch(`${url.origin}/status`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.deepEqual(json, { ok: true });
  } finally {
    await app.close();
  }
});

test('FastifyEngineAdapter supports OPTIONS and HEAD', async () => {
  const app = fastify();
  const quilt = new Quilt(new FastifyEngineAdapter({ fastify: app }));

  const optionsHandler = createHandler({
    execute: async ({ res }) => {
      res.code(200).send({ allow: 'GET,OPTIONS,HEAD' });
    },
  });

  const headHandler = createHandler({
    execute: async ({ res }) => {
      res.code(200).send({ ok: true });
    },
  });

  quilt.options('/resource', optionsHandler);
  quilt.head('/resource', headHandler);

  const address = await app.listen({ port: 0 });
  const url = new URL(address);

  try {
    const resOptions = await fetch(`${url.origin}/resource`, {
      method: 'OPTIONS',
    });
    const jsonOptions = await resOptions.json();
    assert.equal(resOptions.status, 200);
    assert.deepEqual(jsonOptions, { allow: 'GET,OPTIONS,HEAD' });

    const resHead = await fetch(`${url.origin}/resource`, {
      method: 'HEAD',
    });
    assert.equal(resHead.status, 200);
  } finally {
    await app.close();
  }
});

test('FastifyEngineAdapter applies QuiltResponse headers and contentType', async () => {
  const app = fastify();

  const quilt = new Quilt(new FastifyEngineAdapter({ fastify: app }));

  const handler = createHandler({
    execute: async ({ res }) => {
      res.code(201).header('x-quilt', 'fastify').type('text/plain').send('ok');
    },
  });

  quilt.get('/headers', handler);

  const address = await app.listen({ port: 0 });
  const url = new URL(address);

  try {
    const res = await fetch(`${url.origin}/headers`);
    assert.equal(res.status, 201);
    assert.equal(res.headers.get('x-quilt'), 'fastify');
    const contentType = res.headers.get('content-type') ?? '';
    assert.ok(contentType.includes('text/plain'));
    const text = await res.text();
    assert.equal(text.trim(), 'ok');
  } finally {
    await app.close();
  }
});
