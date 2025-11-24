import test from 'node:test';
import assert from 'node:assert/strict';

import { createHandler, executeHandler } from '../dist/index.js';

test('executeHandler runs dependency graph in order and caches outputs', async () => {
  const ctx = { calls: [], result: undefined };

  const handlerA = createHandler({
    id: 'a',
    execute: async (context) => {
      context.calls.push('a');
      return 1;
    },
  });

  const handlerB = createHandler({
    id: 'b',
    dependencies: { a: handlerA },
    execute: async (context, deps) => {
      context.calls.push('b');
      return deps.a + 1;
    },
  });

  const finalHandler = createHandler({
    dependencies: { b: handlerB },
    execute: async (context, deps) => {
      context.calls.push('final');
      context.result = deps.b;
    },
  });

  await executeHandler(finalHandler, ctx);

  assert.deepEqual(ctx.calls, ['a', 'b', 'final']);
  assert.equal(ctx.result, 2);
});

test('executeHandler detects cyclic dependencies', async () => {
  const handlerA = createHandler({
    id: 'A',
    execute: async () => 'A',
  });

  const handlerB = createHandler({
    id: 'B',
    dependencies: { a: handlerA },
    execute: async () => 'B',
  });

  // Introduce a cycle: A -> B -> A
  handlerA.dependencies = { b: handlerB };

  const ctx = {};

  await assert.rejects(
    () => executeHandler(handlerA, ctx),
    (err) =>
      err instanceof Error &&
      err.message.includes('Cyclic dependency detected'),
  );
});
