/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { HttpContext, ServerEngineAdapter } from '../Quilt.js';

/**
 * Adapter that implements the ServerEngine interface using Fastify.
 */
export class FastifyEngineAdapter
  implements ServerEngineAdapter<FastifyRequest, FastifyReply>
{
  private fastify: FastifyInstance;

  constructor({ fastify }: { fastify: FastifyInstance }) {
    this.fastify = fastify;
  }

  public post(
    path: string,
    handler: (req: FastifyRequest, res: FastifyReply) => Promise<void>,
  ): void {
    this.fastify.post(path, async (request, reply) => {
      await handler(request, reply);
    });
  }

  public get(
    path: string,
    handler: (req: FastifyRequest, res: FastifyReply) => Promise<void>,
  ): void {
    this.fastify.get(path, async (request, reply) => {
      await handler(request, reply);
    });
  }

  public patch(
    path: string,
    handler: (req: FastifyRequest, res: FastifyReply) => Promise<void>,
  ): void {
    this.fastify.patch(path, async (request, reply) => {
      await handler(request, reply);
    });
  }

  public put(
    path: string,
    handler: (req: FastifyRequest, res: FastifyReply) => Promise<void>,
  ): void {
    this.fastify.put(path, async (request, reply) => {
      await handler(request, reply);
    });
  }

  public delete(
    path: string,
    handler: (req: FastifyRequest, res: FastifyReply) => Promise<void>,
  ): void {
    this.fastify.delete(path, async (request, reply) => {
      await handler(request, reply);
    });
  }

  public options(
    path: string,
    handler: (req: FastifyRequest, res: FastifyReply) => Promise<void>,
  ): void {
    this.fastify.options(path, async (request, reply) => {
      await handler(request, reply);
    });
  }

  public head(
    path: string,
    handler: (req: FastifyRequest, res: FastifyReply) => Promise<void>,
  ): void {
    this.fastify.head(path, async (request, reply) => {
      await handler(request, reply);
    });
  }
}

export type FastifyHttpContext = HttpContext<FastifyRequest, FastifyReply>;
