import fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify';

import {
  FastifyEngineAdapter,
  type FastifyHttpContext,
} from '../src/adapters/FastifyEngineAdapter.js';
import { Quilt, createHandler } from '../src/index.js';

const app: FastifyInstance = fastify();

const quilt = new Quilt(new FastifyEngineAdapter({ fastify: app }));

const fastifyHandler = createHandler({
  execute: async (ctx: FastifyHttpContext) => {
    const reqOk: FastifyRequest = ctx.req;
    const resOk: FastifyReply = ctx.res;
    void reqOk;
    void resOk;

    // @ts-expect-error req is not a reply
    const badReq: FastifyReply = ctx.req;
    // @ts-expect-error res is not a request
    const badRes: FastifyRequest = ctx.res;
    void badReq;
    void badRes;
  },
});

quilt.get('/type-test-fastify', fastifyHandler);
