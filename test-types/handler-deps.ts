import { createHandler, type Handler } from '../src/Handler.js';

type RequestContext = {
  requestId: string;
};

const requestIdHandler = createHandler({
  id: 'requestId',
  execute: async (ctx: RequestContext) => {
    return ctx.requestId;
  },
});

const userHandler = createHandler({
  id: 'user',
  dependencies: { requestId: requestIdHandler },
  execute: async (_ctx: RequestContext, deps) => {
    const fromDeps = deps.requestId;
    const ok: string = fromDeps;
    // @ts-expect-error requestId is a string, not a number
    const bad: number = fromDeps;
    void ok;
    void bad;
    return { id: fromDeps };
  },
});

export const routeHandler: Handler<
  void,
  RequestContext,
  { user: typeof userHandler }
> = createHandler({
  dependencies: { user: userHandler },
  execute: async (_ctx, deps) => {
    const userId: string = deps.user.id;
    // @ts-expect-error user.id is a string, not a number
    const bad: number = deps.user.id;
    void userId;
    void bad;
    return;
  },
});
