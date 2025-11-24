/* eslint-disable @typescript-eslint/no-explicit-any */
import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import {
  QuiltResponse,
  SinglePartQuiltRequest,
  type HTTPMethod,
  type ServerEngineAdapter,
} from '../Quilt.js';

type NodeHttpRequest = IncomingMessage & {
  params: Record<string, string | undefined>;
  query: Record<string, string | undefined>;
  body: unknown;
};

type NodeHttpHandler = (
  req: NodeHttpRequest,
  res: ServerResponse,
) => Promise<void>;

interface RouteDefinition {
  method: HTTPMethod;
  path: string;
  handler: NodeHttpHandler;
}

/**
 * Minimal adapter that implements the ServerEngineAdapter interface using
 * Node's built-in `http` module.
 *
 * It provides basic routing with support for:
 * - Static paths, e.g. `/status`
 * - Parameterized paths, e.g. `/users/:id/orders/:orderId`
 * - JSON request bodies (when `content-type` includes `application/json`)
 */
export class NodeHttpEngineAdapter
  implements ServerEngineAdapter<NodeHttpRequest, ServerResponse>
{
  private routes: RouteDefinition[] = [];
  private server: http.Server | undefined;
  private port: number | undefined;

  public async toQuiltRequest(
    req: NodeHttpRequest,
  ): Promise<SinglePartQuiltRequest> {
    return new SinglePartQuiltRequest({
      headers: req.headers,
      params: req.params,
      query: req.query,
      body: req.body,
    });
  }

  public get(path: string, handler: NodeHttpHandler): void {
    this.routes.push({ method: 'GET', path, handler });
  }

  public post(path: string, handler: NodeHttpHandler): void {
    this.routes.push({ method: 'POST', path, handler });
  }

  public put(path: string, handler: NodeHttpHandler): void {
    this.routes.push({ method: 'PUT', path, handler });
  }

  public patch(path: string, handler: NodeHttpHandler): void {
    this.routes.push({ method: 'PATCH', path, handler });
  }

  public delete(path: string, handler: NodeHttpHandler): void {
    this.routes.push({ method: 'DELETE', path, handler });
  }

  public options(path: string, handler: NodeHttpHandler): void {
    this.routes.push({ method: 'OPTIONS', path, handler });
  }

  public head(path: string, handler: NodeHttpHandler): void {
    this.routes.push({ method: 'HEAD', path, handler });
  }

  public listen(port: number, callback?: () => void): void {
    // Close any existing server before starting a new one
    if (this.server) {
      this.server.close();
      this.server = undefined;
      this.port = undefined;
    }

    const server = http.createServer(async (req, res) => {
      const method = (req.method || 'GET').toUpperCase() as HTTPMethod;
      const url = req.url ?? '/';

      const requestUrl = new URL(url, 'http://localhost');
      const pathname = requestUrl.pathname;

      const match = this.findRoute(method, pathname);
      if (!match) {
        res.statusCode = 404;
        res.setHeader('content-type', 'text/plain; charset=utf-8');
        res.end('Not Found');
        return;
      }

      const params = match.params;
      const query = Object.fromEntries(
        requestUrl.searchParams.entries(),
      ) as Record<string, string | undefined>;

      const body = await this.readBody(req);

      const nodeReq: NodeHttpRequest = Object.assign(req, {
        params,
        query,
        body,
      });

      await match.route.handler(nodeReq, res);
    });

    this.server = server;

    server.listen(port, () => {
      const address = server.address();
      if (typeof address === 'object' && address !== null) {
        this.port = address.port;
      }
      if (callback) {
        callback();
      }
    });
  }

  public getPort(): number | undefined {
    return this.port;
  }

  public async close(): Promise<void> {
    if (!this.server) {
      return;
    }

    const server = this.server;
    this.server = undefined;
    this.port = undefined;

    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  public handleQuiltResponse(
    response: QuiltResponse,
    res: ServerResponse,
  ): void {
    if (!res.headersSent) {
      res.statusCode = response.status;
      res.setHeader('content-type', 'application/json; charset=utf-8');
    }
    res.end(
      response.body === undefined ? '' : JSON.stringify(response.body, null, 2),
    );
  }

  private findRoute(
    method: HTTPMethod,
    path: string,
  ): {
    route: RouteDefinition;
    params: Record<string, string | undefined>;
  } | null {
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const params = this.matchPath(route.path, path);
      if (params) {
        return { route, params };
      }
    }
    return null;
  }

  private matchPath(
    routePath: string,
    actualPath: string,
  ): Record<string, string | undefined> | null {
    const routeSegments = routePath.split('/').filter(Boolean);
    const pathSegments = actualPath.split('/').filter(Boolean);

    if (routeSegments.length !== pathSegments.length) {
      return null;
    }

    const params: Record<string, string | undefined> = {};

    for (let i = 0; i < routeSegments.length; i++) {
      const routeSegment = routeSegments[i];
      const pathSegment = pathSegments[i];

      if (routeSegment.startsWith(':')) {
        const key = routeSegment.slice(1);
        params[key] = decodeURIComponent(pathSegment);
      } else if (routeSegment !== pathSegment) {
        return null;
      }
    }

    return params;
  }

  private readBody(req: IncomingMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      req.on('data', (chunk) => {
        chunks.push(
          typeof chunk === 'string' ? Buffer.from(chunk) : Buffer.from(chunk),
        );
      });

      req.on('end', () => {
        if (chunks.length === 0) {
          resolve(undefined);
          return;
        }

        const raw = Buffer.concat(chunks).toString('utf8');
        const contentType = req.headers['content-type'];

        if (
          typeof contentType === 'string' &&
          contentType.includes('application/json')
        ) {
          try {
            resolve(JSON.parse(raw));
          } catch {
            resolve(raw);
          }
        } else {
          resolve(raw);
        }
      });

      req.on('error', (err) => {
        reject(err);
      });
    });
  }
}
