/* eslint-disable @typescript-eslint/no-explicit-any */
import { Handler } from './Handler.js';
import { executeHandler } from './executeHandler.js';

export type HTTPMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'OPTIONS'
  | 'HEAD';

export interface ServerEngineAdapter<RequestType, ResponseType> {
  get(
    path: string,
    handler: (req: RequestType, res: ResponseType) => Promise<void>,
  ): void;
  post(
    path: string,
    handler: (req: RequestType, res: ResponseType) => Promise<void>,
  ): void;
  put(
    path: string,
    handler: (req: RequestType, res: ResponseType) => Promise<void>,
  ): void;
  patch(
    path: string,
    handler: (req: RequestType, res: ResponseType) => Promise<void>,
  ): void;
  delete(
    path: string,
    handler: (req: RequestType, res: ResponseType) => Promise<void>,
  ): void;
  options(
    path: string,
    handler: (req: RequestType, res: ResponseType) => Promise<void>,
  ): void;
  head(
    path: string,
    handler: (req: RequestType, res: ResponseType) => Promise<void>,
  ): void;
  listen(port: number, callback?: () => void): void;
}

export type HttpContext<RequestType, ResponseType> = {
  req: RequestType;
  res: ResponseType;
};

type ErrorHandler<RequestType, ResponseType> = (
  error: Error,
  ctx: HttpContext<RequestType, ResponseType>,
) => void | Promise<void>;

export class Quilt<RequestType = any, ResponseType = any> {
  private adapter: ServerEngineAdapter<RequestType, ResponseType>;
  private errorHandler?: ErrorHandler<RequestType, ResponseType>;

  constructor(adapter: ServerEngineAdapter<RequestType, ResponseType>) {
    this.adapter = adapter;
  }

  public get(
    path: string,
    handler: Handler<any, HttpContext<RequestType, ResponseType>>,
  ): void {
    this.adapter.get(path, async (req, res) => {
      await this.handleRequest({ req, res }, handler);
    });
  }

  public post(
    path: string,
    handler: Handler<any, HttpContext<RequestType, ResponseType>>,
  ): void {
    this.adapter.post(path, async (req, res) => {
      await this.handleRequest({ req, res }, handler);
    });
  }

  public put(
    path: string,
    handler: Handler<any, HttpContext<RequestType, ResponseType>>,
  ): void {
    this.adapter.put(path, async (req, res) => {
      await this.handleRequest({ req, res }, handler);
    });
  }

  public patch(
    path: string,
    handler: Handler<any, HttpContext<RequestType, ResponseType>>,
  ): void {
    this.adapter.patch(path, async (req, res) => {
      await this.handleRequest({ req, res }, handler);
    });
  }

  public delete(
    path: string,
    handler: Handler<any, HttpContext<RequestType, ResponseType>>,
  ): void {
    this.adapter.delete(path, async (req, res) => {
      await this.handleRequest({ req, res }, handler);
    });
  }

  public options(
    path: string,
    handler: Handler<any, HttpContext<RequestType, ResponseType>>,
  ): void {
    this.adapter.options(path, async (req, res) => {
      await this.handleRequest({ req, res }, handler);
    });
  }

  public head(
    path: string,
    handler: Handler<any, HttpContext<RequestType, ResponseType>>,
  ): void {
    this.adapter.head(path, async (req, res) => {
      await this.handleRequest({ req, res }, handler);
    });
  }

  public listen(port: number, callback?: () => void): void {
    this.adapter.listen(port, callback);
  }

  public setErrorHandler(
    errorHandler: ErrorHandler<RequestType, ResponseType>,
  ): void {
    this.errorHandler = errorHandler;
  }

  private async handleRequest(
    ctx: HttpContext<RequestType, ResponseType>,
    handler: Handler<any, HttpContext<RequestType, ResponseType>, any>,
  ): Promise<void> {
    if (!this.errorHandler) {
      await executeHandler(handler, ctx);
      return;
    }

    try {
      await executeHandler(handler, ctx);
    } catch (error) {
      if (error instanceof Error) {
        await this.errorHandler(error, ctx);
      } else {
        throw error;
      }
    }
  }
}
