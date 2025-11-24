import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createHandler,
  createMiddlewareHandler,
  executeHandler,
  QuiltResponse,
  SinglePartQuiltRequest,
} from '../dist/index.js';

function createEmptyRequest() {
  return new SinglePartQuiltRequest({
    headers: {},
    params: {},
    query: {},
    body: undefined,
  });
}

test('executeHandler runs dependency graph in order and wraps result', async () => {
  const calls = [];

  const handlerA = createMiddlewareHandler({
    id: 'a',
    execute: async () => {
      calls.push('a');
      return 1;
    },
  });

  const handlerB = createMiddlewareHandler({
    id: 'b',
    dependencies: { a: handlerA },
    execute: async (_req, deps) => {
      calls.push('b');
      return deps.a + 1;
    },
  });

  const finalHandler = createHandler({
    dependencies: { b: handlerB },
    execute: async (_req, deps) => {
      calls.push('final');
      return { result: deps.b };
    },
  });

  const req = createEmptyRequest();

  const response = await executeHandler(finalHandler, req);

  assert.ok(response instanceof QuiltResponse);
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { result: 2 });
  assert.deepEqual(calls, ['a', 'b', 'final']);
});

test('executeHandler detects cyclic dependencies', async () => {
  const handlerA = createMiddlewareHandler({
    id: 'A',
    execute: async () => 'A',
  });

  const handlerB = createMiddlewareHandler({
    id: 'B',
    dependencies: { a: handlerA },
    execute: async () => 'B',
  });

  // Introduce a cycle: A -> B -> A
  handlerA.dependencies = { b: handlerB };

  const req = createEmptyRequest();

  await assert.rejects(
    () => executeHandler(handlerA, req),
    (err) =>
      err instanceof Error &&
      err.message.includes('Cyclic dependency detected'),
  );
});

test('createHandler returns QuiltResponse when handler returns one', async () => {
  const handler = createHandler({
    execute: async () => {
      return new QuiltResponse({
        status: 201,
        body: { ok: true },
        headers: { 'x-quilt': 'core' },
      });
    },
  });

  const req = createEmptyRequest();
  const response = await executeHandler(handler, req);

  assert.ok(response instanceof QuiltResponse);
  assert.equal(response.status, 201);
  assert.deepEqual(response.body, { ok: true });
  assert.equal(response.headers['x-quilt'], 'core');
});
