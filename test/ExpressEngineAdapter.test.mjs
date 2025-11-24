import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {
  Quilt,
  ExpressEngineAdapter,
  QuiltResponse,
  createHandler,
  registerRouters,
} from '../dist/index.js';

test('ExpressEngineAdapter integrates Quilt with Express for GET + query', async () => {
  const app = express();
  const quilt = new Quilt(new ExpressEngineAdapter({ app }));

  const helloHandler = createHandler({
    execute: async (req) => {
      return { message: `hi ${req.query.name ?? 'world'}` };
    },
  });

  quilt.get('/hello', helloHandler);

  const server = app.listen(0);
  const { port } = server.address();

  try {
    const res = await fetch(`http://127.0.0.1:${port}/hello?name=Quilt`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.deepEqual(json, { message: 'hi Quilt' });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('ExpressEngineAdapter maps params and body for POST', async () => {
  const app = express();
  app.use(express.json());

  const quilt = new Quilt(new ExpressEngineAdapter({ app }));

  const echoHandler = createHandler({
    execute: async (req) => {
      return {
        id: req.params.id,
        body: req.body,
      };
    },
  });

  quilt.post('/users/:id', echoHandler);

  const server = app.listen(0);
  const { port } = server.address();

  try {
    const res = await fetch(`http://127.0.0.1:${port}/users/123`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Quilt' }),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.deepEqual(json, { id: '123', body: { name: 'Quilt' } });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('ExpressEngineAdapter respects Quilt error handler', async () => {
  const app = express();
  const quilt = new Quilt(new ExpressEngineAdapter({ app }));

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

  const server = app.listen(0);
  const { port } = server.address();

  try {
    const res = await fetch(`http://127.0.0.1:${port}/fail`);
    assert.equal(res.status, 500);
    const json = await res.json();
    assert.deepEqual(json, { error: 'boom' });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('ExpressEngineAdapter applies QuiltResponse headers and contentType', async () => {
  const app = express();
  const quilt = new Quilt(new ExpressEngineAdapter({ app }));

  const handler = createHandler({
    execute: async () => {
      return new QuiltResponse({
        status: 201,
        body: 'ok',
        headers: { 'x-quilt': 'express' },
        contentType: 'text/plain',
      });
    },
  });

  quilt.get('/headers', handler);

  const server = app.listen(0);
  const address = server.address();

  try {
    if (typeof address !== 'object' || address === null) {
      throw new Error('Failed to obtain server address');
    }

    const port = address.port;

    const res = await fetch(`http://127.0.0.1:${port}/headers`);
    assert.equal(res.status, 201);
    assert.equal(res.headers.get('x-quilt'), 'express');
    const contentType = res.headers.get('content-type') ?? '';
    assert.ok(contentType.includes('text/plain'));
    const text = await res.text();
    assert.equal(text.trim(), 'ok');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('ExpressEngineAdapter works with registerRouters', async () => {
  const app = express();
  const quilt = new Quilt(new ExpressEngineAdapter({ app }));

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

  const server = app.listen(0);
  const { port } = server.address();

  try {
    const res = await fetch(`http://127.0.0.1:${port}/status`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.deepEqual(json, { ok: true });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('ExpressEngineAdapter supports OPTIONS and HEAD', async () => {
  const app = express();
  const quilt = new Quilt(new ExpressEngineAdapter({ app }));

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

  const server = app.listen(0);
  const address = server.address();

  try {
    if (typeof address !== 'object' || address === null) {
      throw new Error('Failed to obtain server address');
    }

    const port = address.port;

    const resOptions = await fetch(`http://127.0.0.1:${port}/resource`, {
      method: 'OPTIONS',
    });
    const jsonOptions = await resOptions.json();
    assert.equal(resOptions.status, 200);
    assert.deepEqual(jsonOptions, { allow: 'GET,OPTIONS,HEAD' });

    const resHead = await fetch(`http://127.0.0.1:${port}/resource`, {
      method: 'HEAD',
    });
    assert.equal(resHead.status, 200);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
