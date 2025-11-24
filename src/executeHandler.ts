/* eslint-disable @typescript-eslint/no-explicit-any */
import { Handler, HandlerOutputs } from './Handler.js';

export type ExecuteHandlerHooks<Ctx> = {
  onHandlerStart?: (info: {
    handler: Handler<any, Ctx, any>;
    ctx: Ctx;
  }) => void | Promise<void>;
  onHandlerSuccess?: (info: {
    handler: Handler<any, Ctx, any>;
    ctx: Ctx;
    durationMs: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    output: any;
  }) => void | Promise<void>;
  onHandlerError?: (info: {
    handler: Handler<any, Ctx, any>;
    ctx: Ctx;
    durationMs: number;
    error: unknown;
  }) => void | Promise<void>;
};

function now(): number {
  if (
    typeof performance !== 'undefined' &&
    typeof performance.now === 'function'
  ) {
    return performance.now();
  }
  return Date.now();
}

/**
 * Executes a handler graph for a given context.
 *
 * Each handler runs at most once per execution, and its output is cached
 * and provided to dependants via the `deps` parameter. The final return
 * value is ignored; callers should rely on handler side-effects (for
 * example, writing to an HTTP response) or on dependency outputs.
 */
export async function executeHandler<
  Ctx,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  D extends Record<string, Handler<any, Ctx, any>>,
>(
  handler: Handler<any, Ctx, D>,
  ctx: Ctx,
  hooks?: ExecuteHandlerHooks<Ctx>,
): Promise<void> {
  // Cache to store handler outputs
  const cache = new Map<Handler<any, Ctx, any>, any>();

  /**
   * Flattens the dependency tree into an ordered array of handlers.
   * Ensures dependencies are executed before their dependents.
   * Also checks for cyclic dependencies.
   */
  function flattenDependencies(
    currentHandler: Handler<any, Ctx, any>,
  ): Handler<any, Ctx, any>[] {
    const flatOrder: Handler<any, Ctx, any>[] = [];
    const visited = new Set<Handler<any, any, any>>();
    const visiting = new Set<Handler<any, any, any>>();

    function visit(h: Handler<any, any, any>): void {
      if (visiting.has(h)) {
        throw new Error('Cyclic dependency detected in handler graph');
      }

      if (visited.has(h)) return;

      visiting.add(h);

      for (const dep of Object.values(h.dependencies)) {
        visit(dep as Handler<any, any, any>);
      }

      visiting.delete(h);
      visited.add(h);
      flatOrder.push(h as Handler<any, Ctx, any>);
    }

    visit(currentHandler);
    return flatOrder;
  }

  // Flatten the dependency tree (with cycle detection) and execute handlers in order
  const flatOrder = flattenDependencies(handler);

  for (const currentHandler of flatOrder) {
    const depsOutputs = {} as HandlerOutputs<any>;
    for (const [depKey, depHandler] of Object.entries(
      currentHandler.dependencies,
    )) {
      depsOutputs[depKey] = cache.get(depHandler as Handler<any, Ctx, any>);
    }

    const start = hooks ? now() : 0;

    if (hooks?.onHandlerStart) {
      await hooks.onHandlerStart({ handler: currentHandler, ctx });
    }

    try {
      const outputs = await currentHandler.execute(ctx, depsOutputs);
      cache.set(currentHandler, outputs);

      if (hooks?.onHandlerSuccess) {
        const end = now();
        await hooks.onHandlerSuccess({
          handler: currentHandler,
          ctx,
          durationMs: end - start,
          output: outputs,
        });
      }
    } catch (error) {
      if (hooks?.onHandlerError) {
        const end = now();
        await hooks.onHandlerError({
          handler: currentHandler,
          ctx,
          durationMs: end - start,
          error,
        });
      }
      throw error;
    }
  }
}
