/* eslint-disable no-console */

import { createHandler, executeHandler } from '../dist/index.js';

const iterations = 100_000;

async function benchQuilt() {
  const ctx = { value: 0, calls: 0 };

  const handlerA = createHandler({
    id: 'a',
    execute: async (context) => {
      // trivial work to avoid being completely empty
      context.calls += 1;
      return context.value + 1;
    },
  });

  const handlerB = createHandler({
    id: 'b',
    dependencies: { a: handlerA },
    execute: async (context, deps) => {
      context.calls += 1;
      return deps.a + 1;
    },
  });

  const finalHandler = createHandler({
    id: 'final',
    dependencies: { b: handlerB },
    execute: async (context, deps) => {
      context.calls += 1;
      context.value = deps.b;
    },
  });

  const start = performance.now();

  for (let i = 0; i < iterations; i += 1) {
    await executeHandler(finalHandler, ctx);
  }

  const end = performance.now();
  return (end - start) / iterations;
}

async function benchBaseline() {
  const ctx = { value: 0, calls: 0 };

  async function fnA(context) {
    context.calls += 1;
    return context.value + 1;
  }

  async function fnB(context, a) {
    context.calls += 1;
    return a + 1;
  }

  async function finalFn(context) {
    const a = await fnA(context);
    const b = await fnB(context, a);
    context.calls += 1;
    context.value = b;
  }

  const start = performance.now();

  for (let i = 0; i < iterations; i += 1) {
    await finalFn(ctx);
  }

  const end = performance.now();
  return (end - start) / iterations;
}

async function main() {
  const baselinePerOpMs = await benchBaseline();
  const quiltPerOpMs = await benchQuilt();

  console.log(`Iterations: ${iterations.toLocaleString('en-US')}`);
  console.log(
    `Baseline (direct async functions): ${baselinePerOpMs.toFixed(4)} ms/op`,
  );
  console.log(
    `Quilt (3-handler graph):           ${quiltPerOpMs.toFixed(4)} ms/op`,
  );
  console.log(
    `Overhead:                           ${(quiltPerOpMs - baselinePerOpMs).toFixed(4)} ms/op`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
