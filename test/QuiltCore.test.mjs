import test from 'node:test';
import assert from 'node:assert/strict';

import { Quilt, createHandler, executeHandler } from '../dist/index.js';

test('executeHandler runs dependency graph in order and caches outputs', async () => {
  const ctx = { calls: [], result: undefined };

  const handlerA = createHandler({
    execute: async (context) => {
      context.calls.push('a');
      return 1;
    },
  });

  const handlerB = createHandler({
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
    execute: async () => 'A',
  });

  const handlerB = createHandler({
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

test('executeHandler invokes hooks for success and error', async () => {
  const events = [];
  const ctx = { calls: [] };

  const okHandler = createHandler({
    execute: async (context) => {
      context.calls.push('ok');
      return 42;
    },
  });

  const failingHandler = createHandler({
    dependencies: { ok: okHandler },
    execute: async () => {
      throw new Error('oops');
    },
  });

  // Success path
  await executeHandler(okHandler, ctx, {
    onHandlerStart: ({ handler }) => {
      events.push({ kind: 'start', handler });
    },
    onHandlerSuccess: ({ handler, durationMs, output }) => {
      events.push({ kind: 'success', handler, durationMs, output });
    },
    onHandlerError: () => {
      events.push({ kind: 'error-unexpected' });
    },
  });

  assert.deepEqual(ctx.calls, ['ok']);
  assert.equal(events[0].kind, 'start');
  assert.equal(events[1].kind, 'success');
  assert.equal(events[1].output, 42);
  assert.ok(events[1].durationMs >= 0);

  // Error path
  const errorEvents = [];
  await assert.rejects(
    () =>
      executeHandler(failingHandler, ctx, {
        onHandlerStart: ({ handler }) => {
          errorEvents.push({ kind: 'start', handler });
        },
        onHandlerSuccess: () => {
          errorEvents.push({ kind: 'success-unexpected' });
        },
        onHandlerError: ({ handler, durationMs, error }) => {
          errorEvents.push({ kind: 'error', handler, durationMs, error });
        },
      }),
    (err) => err instanceof Error && err.message === 'oops',
  );

  assert.equal(errorEvents[0].kind, 'start');
  const errorEvent = errorEvents.find((e) => e.kind === 'error');
  assert.ok(errorEvent);
  assert.ok(errorEvent.durationMs >= 0);
  assert.ok(errorEvent.error instanceof Error);
});

test('Quilt.setHooks invokes hooks for route handlers', async () => {
  const events = [];

  class FakeAdapter {
    constructor() {
      this.handler = null;
    }

    get(_path, handler) {
      this.handler = handler;
    }
  }

  const adapter = new FakeAdapter();
  const quilt = new Quilt(adapter);

  quilt.setHooks({
    onHandlerStart: () => {
      events.push('start');
    },
    onHandlerSuccess: () => {
      events.push('success');
    },
  });

  const routeHandler = createHandler({
    execute: async () => {
      events.push('execute');
    },
  });

  quilt.get('/test', routeHandler);

  // Simulate a request
  await adapter.handler({}, {});

  assert.deepEqual(events, ['start', 'execute', 'success']);
});
