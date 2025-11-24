import {
  type NodeHttpHandlerContext,
  type NodeHttpHandler,
  createNodeHttpRouteHandler,
} from '../src/index.js';

type Params = { id: string | undefined };
type Query = { search: string | undefined };
type Body = { value: number };

const handler: NodeHttpHandler<void, Params, Query, Body> =
  createNodeHttpRouteHandler<void, Params, Query, Body>({
    execute: async (ctx) => {
      const paramsOk: Params = ctx.req.params;
      const queryOk: Query = ctx.req.query;
      const bodyOk: Body = ctx.req.body;

      void paramsOk;
      void queryOk;
      void bodyOk;

      const ctxOk: NodeHttpHandlerContext<Params, Query, Body> = ctx;
      void ctxOk;

      // @ts-expect-error params.id is not a number
      const badParams: { id: number } = ctx.req.params;
      // @ts-expect-error search is not required
      const badQuery: { search: string } = ctx.req.query;
      // @ts-expect-error value is not a string
      const badBody: { value: string } = ctx.req.body;

      void badParams;
      void badQuery;
      void badBody;
    },
  });

void handler;
