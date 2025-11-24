import {
  createHandler,
  createMiddlewareHandler,
  type Handler,
} from '../src/Handler.js';

type RequestContext = {
  requestId: string;
};

const requestIdHandler = createMiddlewareHandler({
  id: 'requestId',
  execute: async (ctx: RequestContext) => {
    return ctx.requestId;
  },
});

const userHandler = createMiddlewareHandler({
  id: 'user',
  dependencies: { requestId: requestIdHandler },
  execute: async (_ctx: RequestContext, deps) => {
    const fromDeps = deps.requestId;
    const ok: string = fromDeps;
    // @ts-expect-error requestId is a string, not a number
    const bad: number = fromDeps;
    return { id: fromDeps };
  },
});

const routeHandler: Handler<
  void,
  RequestContext,
  { user: typeof userHandler }
> = createHandler({
  dependencies: { user: userHandler },
  execute: async (_ctx, deps) => {
    const userId: string = deps.user.id;
    // @ts-expect-error user.id is a string, not a number
    const bad: number = deps.user.id;
    return;
  },
});
