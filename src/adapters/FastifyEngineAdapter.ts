/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference types="node" />
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { File } from 'node:buffer';
import {
  MultiPartQuiltRequest,
  QuiltResponse,
  ServerEngineAdapter,
  SinglePartQuiltRequest,
} from '../Quilt.js';

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

  public async toQuiltRequest(
    req: FastifyRequest,
  ): Promise<SinglePartQuiltRequest | MultiPartQuiltRequest> {
    const anyReq = req as any;
    if (typeof anyReq.isMultipart === 'function' && anyReq.isMultipart()) {
      const fields: Record<string, string | File> = {};

      const parts = anyReq.parts();
      for await (const part of parts) {
        if (part.type === 'file') {
          const fileBuffer = await part.toBuffer();
          const mockFile = new File([fileBuffer], part.filename || 'unnamed', {
            type: part.mimetype,
          });
          fields[part.fieldname] = mockFile;
        } else {
          if (typeof part.value !== 'string') {
            throw new Error('Expected string value for non-file part');
          }
          fields[part.fieldname] = part.value;
        }
      }

      return new MultiPartQuiltRequest({
        headers: req.headers,
        params: req.params as Record<string, string | undefined>,
        query: req.query as Record<string, string | undefined>,
        fields,
      });
    }

    // If not multipart, assume it's a general data request
    return new SinglePartQuiltRequest({
      headers: req.headers,
      params: req.params as Record<string, string | undefined>,
      query: req.query as Record<string, string | undefined>,
      body: req.body,
    });
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

  public listen(port: number, callback?: () => void): void {
    this.fastify.listen({ port }, (err, address) => {
      if (err) {
        throw err;
      }
      console.log(`Server listening at ${address}`);
      if (callback) callback();
    });
  }

  handleQuiltResponse(response: QuiltResponse, res: FastifyReply): any {
    return res.code(response.status).send(response.body);
  }
}
