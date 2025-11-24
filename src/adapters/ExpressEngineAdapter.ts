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

  public async toQuiltRequest(
    req: Request,
    res: Response,
  ): Promise<SinglePartQuiltRequest> {
    return new SinglePartQuiltRequest({
      headers: req.headers,
      params: req.params as Record<string, string | undefined>,
      query: req.query as Record<string, string | undefined>,
      body: req.body,
      raw: {
        framework: 'express',
        request: req,
        response: res,
      },
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
    let expr = res.status(response.status);

    for (const [key, value] of Object.entries(response.headers)) {
      expr = expr.set(key, value);
    }

    if (response.contentType) {
      expr = expr.type(response.contentType);
    }

    return expr.send(response.body);
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
