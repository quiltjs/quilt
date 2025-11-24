import {
  type NodeHttpHandlerContext,
  type NodeHttpHandler,
} from '../src/index.js';
import { createHandler, type NodeHttpContext } from '../src/index.js';

type Params = { id: string | undefined };
type Query = { search: string | undefined };
type Body = { value: number };

const handler: NodeHttpHandler<void, Params, Query, Body> = createHandler({
  // This asserts that a NodeHttpContext matches a NodeHttpHandlerContext
  execute: async (ctx: NodeHttpContext) => {
    const ctxTyped = ctx as NodeHttpHandlerContext<Params, Query, Body>;

    const paramsOk: Params = ctxTyped.req.params;
    const queryOk: Query = ctxTyped.req.query;
    const bodyOk: Body = ctxTyped.req.body;

    void paramsOk;
    void queryOk;
    void bodyOk;

    const ctxOk: NodeHttpHandlerContext<Params, Query, Body> = ctxTyped;
    void ctxOk;

    // @ts-expect-error params.id is not a number
    const badParams: { id: number } = ctxTyped.req.params;
    // @ts-expect-error search is not required
    const badQuery: { search: string } = ctxTyped.req.query;
    // @ts-expect-error value is not a string
    const badBody: { value: string } = ctxTyped.req.body;

    void badParams;
    void badQuery;
    void badBody;
  },
});

void handler;
