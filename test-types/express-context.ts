import express from 'express';

import type { Request, Response } from 'express';

import {
  ExpressEngineAdapter,
  type ExpressHttpContext,
} from '../src/adapters/ExpressEngineAdapter.js';
import { Quilt, createHandler } from '../src/index.js';

const app = express();

const quilt = new Quilt(new ExpressEngineAdapter({ app }));

const expressHandler = createHandler({
  execute: async (ctx: ExpressHttpContext) => {
    const reqOk: Request = ctx.req;
    const resOk: Response = ctx.res;
    void reqOk;
    void resOk;

    // @ts-expect-error req is not a Response
    const badReq: Response = ctx.req;
    // @ts-expect-error res is not a Request
    const badRes: Request = ctx.res;
    void badReq;
    void badRes;
  },
});

quilt.get('/type-test-express', expressHandler);
