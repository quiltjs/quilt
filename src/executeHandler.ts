/* eslint-disable @typescript-eslint/no-explicit-any */
import { Handler, HandlerOutputs } from './Handler.js';

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
>(handler: Handler<any, Ctx, D>, ctx: Ctx): Promise<void> {
  // Cache to store handler outputs
  const cache = new Map<string | Handler<any, Ctx, any>, any>();

  /**
   * Determines the cache key for a given handler.
   * Uses handler.id if available; otherwise, uses the handler object itself.
   */
  function getHandlerKey(
    h: Handler<any, Ctx, any>,
  ): string | Handler<any, Ctx, any> {
    return h.id ?? h;
  }

  /**
   * Flattens the dependency tree into an ordered array of handlers.
   * Ensures dependencies are executed before their dependents.
   * Also checks for cyclic dependencies.
   */
  function flattenDependencies(
    currentHandler: Handler<any, Ctx, any>,
  ): Handler<any, Ctx, any>[] {
    const flatOrder: Handler<any, Ctx, any>[] = [];
    const visited = new Set<string | Handler<any, any, any>>();
    const visiting = new Set<string | Handler<any, any, any>>();

    function visit(h: Handler<any, any, any>): void {
      const key = h.id ?? h;

      if (visiting.has(key)) {
        throw new Error(
          `Cyclic dependency detected for handler ${h.id ?? 'without id'}`,
        );
      }

      if (visited.has(key)) return;

      visiting.add(key);

      for (const dep of Object.values(h.dependencies)) {
        visit(dep as Handler<any, any, any>);
      }

      visiting.delete(key);
      visited.add(key);
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
      depsOutputs[depKey] = cache.get(
        getHandlerKey(depHandler as Handler<any, Ctx, any>),
      );
    }

    const outputs = await currentHandler.execute(ctx, depsOutputs);
    cache.set(getHandlerKey(currentHandler), outputs);
  }
}
