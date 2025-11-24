/**
 * Represents the outputs of dependencies as a record with keys.
 */
export type HandlerOutputs<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  D extends Record<string, Handler<any, any, any>>,
> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in keyof D]: D[K] extends Handler<infer O, any, any> ? O : never;
};

/**
 * Represents a handler with its named dependencies and handler function.
 *
 * `Ctx` is an arbitrary context type (for example `{ req, res }` in HTTP
 * adapters). Quilt itself does not assume anything about this shape.
 */
export type Handler<
  O,
  Ctx,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  D extends Record<string, Handler<any, Ctx, any>> = {},
> = {
  /**
   * Optional id for caching; two handlers with the same id will be treated
   * as the same handler within a single execution context.
   */
  id?: string;
  /**
   * Named dependency handlers. Their outputs are made available to this
   * handler as the `deps` parameter.
   */
  dependencies: D;
  /**
   * Executes the handler.
   *
   * @param ctx  - The execution context (e.g. `{ req, res }`).
   * @param deps - The outputs from dependencies.
   */
  execute: (ctx: Ctx, deps: HandlerOutputs<D>) => Promise<O> | O;
};

/**
 * Creates a "terminal" handler in a dependency graph.
 *
 * Works for both "middleware-like" handlers (that produce values for others)
 * and "terminal" handlers at the edge of the system.
 */
export function createHandler<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  O = any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Ctx = any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  D extends Record<string, Handler<any, Ctx, any>> = {},
>({
  id,
  execute,
  dependencies,
}: {
  id?: string;
  execute: (ctx: Ctx, deps: HandlerOutputs<D>) => Promise<O> | O;
  dependencies?: D;
}): Handler<O, Ctx, D> {
  return {
    id,
    dependencies: (dependencies || {}) as D,
    execute,
  };
}
