import fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify';

import { Quilt } from '../src/Quilt.js';
import { FastifyEngineAdapter } from '../src/adapters/FastifyEngineAdapter.js';
import { createHandler } from '../src/Handler.js';

const app: FastifyInstance = fastify();

const quilt = new Quilt(new FastifyEngineAdapter({ fastify: app }));

const fastifyHandler = createHandler({
  execute: async (ctx: { req: FastifyRequest; res: FastifyReply }) => {
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

