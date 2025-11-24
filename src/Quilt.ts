/* eslint-disable @typescript-eslint/no-explicit-any */
import { File } from 'node:buffer';
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
  toQuiltRequest(
    req: RequestType,
    res: ResponseType,
  ): Promise<SinglePartQuiltRequest | MultiPartQuiltRequest>;
  handleQuiltResponse(
    response: QuiltResponse,
    res: ResponseType,
  ): void | Promise<void>;
}

type ErrorHandler = (error: Error) => QuiltResponse;

export class Quilt {
  private adapter: ServerEngineAdapter<any, any>;
  private errorHandler: ErrorHandler | undefined;

  constructor(adapter: ServerEngineAdapter<any, any>) {
    this.adapter = adapter;
  }

  public get(path: string, handler: Handler<any, any>): void {
    this.adapter.get(path, async (req, res) => {
      await this.handleRequest(req, res, handler);
    });
  }

  public post(path: string, handler: Handler<any, any>): void {
    this.adapter.post(path, async (req, res) => {
      await this.handleRequest(req, res, handler);
    });
  }

  public put(path: string, handler: Handler<any, any>): void {
    this.adapter.put(path, async (req, res) => {
      await this.handleRequest(req, res, handler);
    });
  }

  public patch(path: string, handler: Handler<any, any>): void {
    this.adapter.patch(path, async (req, res) => {
      await this.handleRequest(req, res, handler);
    });
  }

  public delete(path: string, handler: Handler<any, any>): void {
    this.adapter.delete(path, async (req, res) => {
      await this.handleRequest(req, res, handler);
    });
  }

  public options(path: string, handler: Handler<any, any>): void {
    this.adapter.options(path, async (req, res) => {
      await this.handleRequest(req, res, handler);
    });
  }

  public head(path: string, handler: Handler<any, any>): void {
    this.adapter.head(path, async (req, res) => {
      await this.handleRequest(req, res, handler);
    });
  }

  public listen(port: number, callback?: () => void): void {
    this.adapter.listen(port, callback);
  }

  public setErrorHandler(errorHandler: ErrorHandler): void {
    this.errorHandler = errorHandler;
  }

  private async wrapWithErrorHandler(
    handler: () => Promise<QuiltResponse>,
  ): Promise<QuiltResponse> {
    if (!this.errorHandler) {
      return await handler();
    }
    try {
      return await handler();
    } catch (error) {
      if (error instanceof Error) {
        return this.errorHandler(error);
      }
      throw error;
    }
  }

  private async handleRequest(
    req: any,
    res: any,
    handler: Handler<any, any, any>,
  ): Promise<void> {
    const quiltResponse = await this.wrapWithErrorHandler(
      async () =>
        await executeHandler(
          handler,
          await this.adapter.toQuiltRequest(req, res),
        ),
    );
    await this.adapter.handleQuiltResponse(quiltResponse, res);
  }
}

export abstract class QuiltRequest {
  abstract headers: Record<string, string | string[] | undefined>;
  abstract params: Record<string, string | undefined>;
  abstract query: Record<string, string | undefined>;
  raw?:
    | {
        framework: string;
        request: unknown;
        response: unknown;
      }
    | undefined;

  isMultipart(): this is MultiPartQuiltRequest {
    return false;
  }

  isSinglePart(): this is SinglePartQuiltRequest {
    return false;
  }
}

export class SinglePartQuiltRequest extends QuiltRequest {
  headers: Record<string, string | string[] | undefined>;
  params: Record<string, string | undefined>;
  query: Record<string, string | undefined>;
  body: unknown;

  constructor({
    headers,
    params,
    query,
    body,
    raw,
  }: {
    headers: Record<string, string | string[] | undefined>;
    params: Record<string, string | undefined>;
    query: Record<string, string | undefined>;
    body: unknown;
    raw?:
      | {
          framework: string;
          request: unknown;
          response: unknown;
        }
      | undefined;
  }) {
    super();
    this.headers = headers;
    this.params = params;
    this.query = query;
    this.body = body;
    this.raw = raw;
  }

  isSinglePart(): this is SinglePartQuiltRequest {
    return true;
  }
}

export class MultiPartQuiltRequest extends QuiltRequest {
  headers: Record<string, string | string[] | undefined>;
  params: Record<string, string | undefined>;
  query: Record<string, string | undefined>;
  fields: Record<string, string | File>;

  constructor({
    headers,
    params,
    query,
    fields,
    raw,
  }: {
    headers: Record<string, string | string[] | undefined>;
    params: Record<string, string | undefined>;
    query: Record<string, string | undefined>;
    fields: Record<string, string | File>;
    raw?:
      | {
          framework: string;
          request: unknown;
          response: unknown;
        }
      | undefined;
  }) {
    super();
    this.headers = headers;
    this.params = params;
    this.query = query;
    this.fields = fields;
    this.raw = raw;
  }

  isMultipart(): this is MultiPartQuiltRequest {
    return true;
  }
}

export interface QuiltResponseInit {
  status: number;
  body?: any;
  headers?: Record<string, string>;
  contentType?: string;
}

export class QuiltResponse {
  status: number;
  body: any;
  headers: Record<string, string>;
  contentType?: string;

  constructor({ status, body, headers, contentType }: QuiltResponseInit) {
    this.status = status;
    this.body = body;
    this.headers = headers ?? {};
    this.contentType = contentType;
  }
}
