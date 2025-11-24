/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Express, Request, Response } from 'express';
import type { HttpContext, ServerEngineAdapter } from '../Quilt.js';

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

export type ExpressHttpContext = HttpContext<Request, Response>;
