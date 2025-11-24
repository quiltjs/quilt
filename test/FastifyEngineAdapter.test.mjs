import test from 'node:test';
import assert from 'node:assert/strict';
import fastify from 'fastify';
import multipart from '@fastify/multipart';

import {
  Quilt,
  FastifyEngineAdapter,
  QuiltResponse,
  createHandler,
  registerRouters,
} from '../dist/index.js';

test('FastifyEngineAdapter integrates Quilt with Fastify for GET + query', async () => {
  const app = fastify();

  const quilt = new Quilt(new FastifyEngineAdapter({ fastify: app }));

  const helloHandler = createHandler({
    execute: async (req) => {
      return { message: `hi ${req.query.name ?? 'world'}` };
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
    execute: async (req) => {
      return {
        id: req.params.id,
        body: req.body,
      };
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

  quilt.setErrorHandler((error) => {
    return new QuiltResponse({
      status: 500,
      body: { error: error.message },
    });
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
