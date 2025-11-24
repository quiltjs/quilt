/* eslint-disable @typescript-eslint/no-explicit-any */
import { Handler } from './Handler.js';
import { executeHandler, type ExecuteHandlerHooks } from './executeHandler.js';

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
}

export type HttpContext<RequestType, ResponseType> = {
  req: RequestType;
  res: ResponseType;
};

export type QuiltHooks<RequestType, ResponseType> = ExecuteHandlerHooks<
  HttpContext<RequestType, ResponseType>
>;

type ErrorHandler<RequestType, ResponseType> = (
  error: Error,
  ctx: HttpContext<RequestType, ResponseType>,
) => void | Promise<void>;

export class Quilt<RequestType = any, ResponseType = any> {
  private adapter: ServerEngineAdapter<RequestType, ResponseType>;
  private errorHandler?: ErrorHandler<RequestType, ResponseType>;
  private hooks?: QuiltHooks<RequestType, ResponseType>;

  constructor(adapter: ServerEngineAdapter<RequestType, ResponseType>) {
    this.adapter = adapter;
  }

  public get<
    O,
    D extends Record<
      string,
      Handler<any, HttpContext<RequestType, ResponseType>, any>
    >,
  >(
    path: string,
    handler: Handler<O, HttpContext<RequestType, ResponseType>, D>,
  ): void {
    this.adapter.get(path, async (req, res) => {
      await this.handleRequest({ req, res }, handler);
    });
  }

  public post<
    O,
    D extends Record<
      string,
      Handler<any, HttpContext<RequestType, ResponseType>, any>
    >,
  >(
    path: string,
    handler: Handler<O, HttpContext<RequestType, ResponseType>, D>,
  ): void {
    this.adapter.post(path, async (req, res) => {
      await this.handleRequest({ req, res }, handler);
    });
  }

  public put<
    O,
    D extends Record<
      string,
      Handler<any, HttpContext<RequestType, ResponseType>, any>
    >,
  >(
    path: string,
    handler: Handler<O, HttpContext<RequestType, ResponseType>, D>,
  ): void {
    this.adapter.put(path, async (req, res) => {
      await this.handleRequest({ req, res }, handler);
    });
  }

  public patch<
    O,
    D extends Record<
      string,
      Handler<any, HttpContext<RequestType, ResponseType>, any>
    >,
  >(
    path: string,
    handler: Handler<O, HttpContext<RequestType, ResponseType>, D>,
  ): void {
    this.adapter.patch(path, async (req, res) => {
      await this.handleRequest({ req, res }, handler);
    });
  }

  public delete<
    O,
    D extends Record<
      string,
      Handler<any, HttpContext<RequestType, ResponseType>, any>
    >,
  >(
    path: string,
    handler: Handler<O, HttpContext<RequestType, ResponseType>, D>,
  ): void {
    this.adapter.delete(path, async (req, res) => {
      await this.handleRequest({ req, res }, handler);
    });
  }

  public options<
    O,
    D extends Record<
      string,
      Handler<any, HttpContext<RequestType, ResponseType>, any>
    >,
  >(
    path: string,
    handler: Handler<O, HttpContext<RequestType, ResponseType>, D>,
  ): void {
    this.adapter.options(path, async (req, res) => {
      await this.handleRequest({ req, res }, handler);
    });
  }

  public head<
    O,
    D extends Record<
      string,
      Handler<any, HttpContext<RequestType, ResponseType>, any>
    >,
  >(
    path: string,
    handler: Handler<O, HttpContext<RequestType, ResponseType>, D>,
  ): void {
    this.adapter.head(path, async (req, res) => {
      await this.handleRequest({ req, res }, handler);
    });
  }

  public setErrorHandler(
    errorHandler: ErrorHandler<RequestType, ResponseType>,
  ): void {
    this.errorHandler = errorHandler;
  }

  public setHooks(hooks: QuiltHooks<RequestType, ResponseType>): void {
    this.hooks = hooks;
  }

  private async handleRequest<
    O,
    D extends Record<
      string,
      Handler<any, HttpContext<RequestType, ResponseType>, any>
    >,
  >(
    ctx: HttpContext<RequestType, ResponseType>,
    handler: Handler<O, HttpContext<RequestType, ResponseType>, D>,
  ): Promise<void> {
    if (!this.errorHandler) {
      await executeHandler(handler, ctx, this.hooks);
      return;
    }

    try {
      await executeHandler(handler, ctx, this.hooks);
    } catch (error) {
      if (error instanceof Error) {
        await this.errorHandler(error, ctx);
      } else {
        throw error;
      }
    }
  }
}
