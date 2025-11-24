/**
 * Represents the outputs of dependencies as a record with keys.
 */
export type HandlerOutputs<D extends Record<string, Handler<any, any, any>>> = {
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
   * @param next - An async function to continue execution, optionally
   *               accepting a value to cache as this handler's output.
   */
  execute: (
    ctx: Ctx,
    deps: HandlerOutputs<D>,
    next: (value?: O) => Promise<O>,
  ) => Promise<O> | O;
};

/**
 * Creates a "terminal" handler in a dependency graph.
 *
 * Works for both "middleware-like" handlers (that produce values for others)
 * and "terminal" handlers at the edge of the system.
 */
export function createHandler<
  O = any,
  Ctx = any,
  D extends Record<string, Handler<any, Ctx, any>> = {},
>({
  id,
  execute,
  dependencies,
}: {
  id?: string;
  execute: (
    ctx: Ctx,
    deps: HandlerOutputs<D>,
    next: (value?: O) => Promise<O>,
  ) => Promise<O> | O;
  dependencies?: D;
}): Handler<O, Ctx, D> {
  return {
    id,
    dependencies: (dependencies || {}) as D,
    execute,
  };
}
