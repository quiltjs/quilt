import { QuiltRequest, QuiltResponse } from './Quilt.js';

/**
 * Represents the outputs of dependencies as a record with keys.
 */
export type HandlerOutputs<D extends Record<string, Handler<any, any>>> = {
  [K in keyof D]: D[K] extends Handler<infer O, any> ? O : never;
};

/**
 * Represents a handler with its named dependencies and handler function.
 */
export type Handler<
  O,
  T extends QuiltRequest,
  D extends Record<string, Handler<any, any>> = {},
> = {
  /**
   * Optional id for caching, two handlers with the same id will be considered the same handler
   * within a single execution context.
   */
  id?: string;
  dependencies: D;
  /**
   * Executes the handler.
   *
   * @param req - The QuiltRequest object.
   * @param deps - The outputs from dependencies.
   * @param next - An asynchronous function to continue execution, optionally accepting a value to terminate early.
   * @returns The handler's output.
   */
  execute: (
    req: T,
    deps: HandlerOutputs<D>,
    next: (value?: O) => Promise<O>,
  ) => Promise<O> | O;
};

/**
 * Creates a handler that depends on other handlers.
 *
 * @param params - An object containing the handler's properties.
 * @returns A handler that can be used in a handler pipeline.
 *
 * @example
 *
 * ```typescript
 * const handlerA = createHandler<string>({ execute: async () => 'Hello' });
 * const handlerB = createHandler<number>({ execute: async () => 42 });
 *
 * const combinedHandler = createHandler<
 *   { message: string; number: number },
 *   { a: typeof handlerA; b: typeof handlerB }
 * >({
 *   execute: async (req, deps, next) => ({
 *     message: deps.a,
 *     number: deps.b,
 *   }),
 *   dependencies: { a: handlerA, b: handlerB },
 * });
 * ```
 */
export function createMiddlewareHandler<
  O,
  T extends QuiltRequest,
  D extends Record<string, Handler<any, any, any>>,
>({
  id,
  execute,
  dependencies,
}: {
  id?: string;
  execute: (
    req: T,
    deps: HandlerOutputs<D>,
    next: (value?: O) => Promise<O>,
  ) => Promise<O> | O;
  dependencies?: D;
}): Handler<O, T, D> {
  return {
    id,
    dependencies: dependencies || ({} as D),
    execute,
  };
}

// End handlers must resolve to a QuiltResponse
export function createHandler<
  D extends Record<string, Handler<any, any, any>>,
>({
  id,
  execute,
  dependencies,
}: {
  id?: string;
  execute: (
    req: QuiltRequest,
    deps: HandlerOutputs<D>,
    next: (value?: any) => Promise<any>,
  ) => Promise<any> | any;
  dependencies?: D;
}): Handler<any, QuiltRequest, D> {
  return {
    id,
    dependencies: dependencies || ({} as D),
    // Wrap with QuiltResponse
    execute: async (req, deps, next) => {
      const result = await execute(req, deps, next);
      return new QuiltResponse({
        status: 200,
        body: result,
      });
    },
  };
}
