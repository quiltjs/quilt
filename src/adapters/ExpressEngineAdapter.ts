/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Express, Request, Response } from 'express';
import {
  QuiltResponse,
  SinglePartQuiltRequest,
  type ServerEngineAdapter,
} from '../Quilt.js';

/**
 * Adapter that implements the ServerEngineAdapter interface using Express.
 *
 * This adapter assumes you have already registered any body-parser or
 * JSON middleware you need on the Express app.
 */
export class ExpressEngineAdapter
  implements ServerEngineAdapter<Request, Response>
{
  private app: Express;

  constructor({ app }: { app: Express }) {
    this.app = app;
  }

  public async toQuiltRequest(req: Request): Promise<SinglePartQuiltRequest> {
    return new SinglePartQuiltRequest({
      headers: req.headers,
      params: req.params as Record<string, string | undefined>,
      query: req.query as Record<string, string | undefined>,
      body: req.body,
    });
  }

  public get(
    path: string,
    handler: (req: Request, res: Response) => Promise<void>,
  ): void {
    this.app.get(path, async (req, res) => {
      await handler(req, res);
    });
  }

  public post(
    path: string,
    handler: (req: Request, res: Response) => Promise<void>,
  ): void {
    this.app.post(path, async (req, res) => {
      await handler(req, res);
    });
  }

  public put(
    path: string,
    handler: (req: Request, res: Response) => Promise<void>,
  ): void {
    this.app.put(path, async (req, res) => {
      await handler(req, res);
    });
  }

  public patch(
    path: string,
    handler: (req: Request, res: Response) => Promise<void>,
  ): void {
    this.app.patch(path, async (req, res) => {
      await handler(req, res);
    });
  }

  public delete(
    path: string,
    handler: (req: Request, res: Response) => Promise<void>,
  ): void {
    this.app.delete(path, async (req, res) => {
      await handler(req, res);
    });
  }

  public listen(port: number, callback?: () => void): void {
    this.app.listen(port, () => {
      if (callback) {
        callback();
      }
    });
  }

  public handleQuiltResponse(response: QuiltResponse, res: Response): any {
    return res.status(response.status).send(response.body);
  }

  public options(
    path: string,
    handler: (req: Request, res: Response) => Promise<void>,
  ): void {
    this.app.options(path, async (req, res) => {
      await handler(req, res);
    });
  }

  public head(
    path: string,
    handler: (req: Request, res: Response) => Promise<void>,
  ): void {
    this.app.head(path, async (req, res) => {
      await handler(req, res);
    });
  }
}
