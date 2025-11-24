import { Handler, HandlerOutputs } from './Handler.js';
import { QuiltRequest, QuiltResponse } from './Quilt.js';

export async function executeHandler<
  O,
  T extends QuiltRequest,
  D extends Record<string, Handler<any, T, any>>,
>(handler: Handler<O, T, D>, req: T): Promise<QuiltResponse> {
  // Cache to store handler outputs
  const cache = new Map<string | Handler<any, any>, any>();

  /**
   * Determines the cache key for a given handler.
   * Uses handler.id if available; otherwise, uses the handler object itself.
   */
  function getHandlerKey(
    handler: Handler<any, T, any>,
  ): string | Handler<any, T, any> {
    return handler.id ?? handler;
  }

  /**
   * Flattens the dependency tree into an ordered array of handlers.
   * Ensures dependencies are executed before their dependents.
   * Also checks for cyclic dependencies.
   */
  function flattenDependencies(
    currentHandler: Handler<any, T, any>,
  ): Handler<any, T, any>[] {
    const flatOrder: Handler<any, T, any>[] = [];
    const visited = new Set<string | Handler<any, any>>();
    const visiting = new Set<string | Handler<any, any>>();

    function visit(handler: Handler<any, any>) {
      const key = getHandlerKey(handler);

      if (visiting.has(key)) {
        throw new Error(
          `Cyclic dependency detected for handler ${handler.id ?? 'without id'}`,
        );
      }

      if (visited.has(key)) return;

      visiting.add(key);

      for (const dep of Object.values(handler.dependencies)) {
        visit(dep as Handler<any, any>);
      }

      visiting.delete(key);
      visited.add(key);
      flatOrder.push(handler);
    }

    visit(currentHandler);
    return flatOrder;
  }

  /**
   * Executes handlers recursively, using next() to encapsulate recursive calls.
   */
  async function next(currentHandlerIndex: number): Promise<any> {
    const currentHandler = flatOrder[currentHandlerIndex];
    if (!currentHandler) return;
    const depsOutputs = {} as HandlerOutputs<any>;
    for (const [depKey, depHandler] of Object.entries(
      currentHandler.dependencies,
    )) {
      depsOutputs[depKey] = cache.get(
        getHandlerKey(depHandler as Handler<any, any>),
      );
    }

    let calledNext = false;

    // Check if cached
    if (cache.has(getHandlerKey(currentHandler))) {
      return await next(currentHandlerIndex + 1);
    }

    const outputs = await currentHandler.execute(
      req,
      depsOutputs,
      async (value?: any) => {
        // If next() is called with a value, cache it and continue execution
        calledNext = true;
        if (value !== undefined) {
          cache.set(getHandlerKey(currentHandler), value);
        }

        // If value is a QuiltResponse, return it immediately
        if (value instanceof QuiltResponse) {
          return value;
        }

        return await next(currentHandlerIndex + 1);
      },
    );

    if (outputs instanceof QuiltResponse) {
      return outputs; // Return QuiltResponse immediately
    }

    if (!calledNext) {
      cache.set(getHandlerKey(currentHandler), outputs);
      return await next(currentHandlerIndex + 1);
    }
  }

  // Flatten the dependency tree (with cycle detection) and execute handlers in order
  const flatOrder = flattenDependencies(handler);
  const finalOutput = await next(0);

  // Ensure the final output is a QuiltResponse
  if (!(finalOutput instanceof QuiltResponse)) {
    throw new Error(
      `The handler chain must return a QuiltResponse, but received ${finalOutput}`,
    );
  }

  return finalOutput;
}
