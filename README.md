# @quiltjs/quilt

Lightweight, type-safe request handling and routing for Node HTTP servers, with first-class Fastify and Express support.

`@quiltjs/quilt` lets you build HTTP APIs from small, composable, strongly-typed “handlers”
instead of ad-hoc middleware that mutates `req`/`res`. It is designed to be framework-agnostic and
to sit cleanly on top of your HTTP server of choice.

- Strong TypeScript types for handlers and their dependencies
- Explicit dependency graph instead of “magic” middleware ordering
- Framework abstraction via `ServerEngineAdapter` (Fastify and Express adapters included)
- Simple routing via `Quilt` and `QuiltRouter`
- JSON and multipart/form-data support

---

## Installation

Fastify:

```bash
npm install @quiltjs/quilt @fastify/multipart fastify
# or
pnpm add @quiltjs/quilt @fastify/multipart fastify
```

Express:

```bash
npm install @quiltjs/quilt express
# or
pnpm add @quiltjs/quilt express
```

Fastify/Express are peer dependencies because Quilt can be used with other HTTP engines via custom
adapters.

---

## Quick start (Fastify)

```ts
import fastify from 'fastify';
import multipart from '@fastify/multipart';
import {
  Quilt,
  FastifyEngineAdapter,
  createHandler,
  registerRouters,
  type QuiltRouter,
} from '@quiltjs/quilt';

const server = fastify();
await server.register(multipart);

const quilt = new Quilt(new FastifyEngineAdapter({ fastify: server }));

// Simple handler that returns a JSON body
const helloHandler = createHandler({
  execute: async (req) => {
    return { message: `Hello, ${req.query.name ?? 'world'}!` };
  },
});

class HelloRouter implements QuiltRouter {
  readonly prefix = '/api';

  getRoutes() {
    return [
      {
        method: 'GET',
        path: '/hello',
        handler: helloHandler,
      },
    ];
  }
}

registerRouters(quilt, new HelloRouter());

await server.listen({ host: '0.0.0.0', port: 3000 });
```

Now `GET /api/hello?name=Quilt` returns:

```json
{ "message": "Hello, Quilt!" }
```

---

## Quick start (Express)

```ts
import express from 'express';
import {
  Quilt,
  ExpressEngineAdapter,
  createHandler,
  registerRouters,
  type QuiltRouter,
} from '@quiltjs/quilt';

const app = express();
app.use(express.json());

const quilt = new Quilt(new ExpressEngineAdapter({ app }));

const helloHandler = createHandler({
  execute: async (req) => {
    return { message: `Hello, ${req.query.name ?? 'world'}!` };
  },
});

class HelloRouter implements QuiltRouter {
  readonly prefix = '/api';

  getRoutes() {
    return [
      {
        method: 'GET',
        path: '/hello',
        handler: helloHandler,
      },
    ];
  }
}

registerRouters(quilt, new HelloRouter());

quilt.listen(3000, () => {
  console.log('Server listening on http://localhost:3000');
});
```

---

## Quick start (Node http)

```ts
import http from 'node:http';
import {
  Quilt,
  NodeHttpEngineAdapter,
  createHandler,
  registerRouters,
  type QuiltRouter,
} from '@quiltjs/quilt';

const adapter = new NodeHttpEngineAdapter();
const quilt = new Quilt(adapter);

const helloHandler = createHandler({
  execute: async (req) => {
    return { message: `Hello, ${req.query.name ?? 'world'}!` };
  },
});

class HelloRouter implements QuiltRouter {
  readonly prefix = '/api';

  getRoutes() {
    return [
      {
        method: 'GET',
        path: '/hello/:name',
        handler: helloHandler,
      },
    ];
  }
}

registerRouters(quilt, new HelloRouter());

adapter.listen(3000, () => {
  console.log('Server listening on http://localhost:3000');
});
```

---

## Core concepts

### Handlers

A **handler** is a small unit of work that:

- Receives a `QuiltRequest` (or subtype)
- Optionally depends on other handlers
- Returns a value that can be consumed by downstream handlers

You usually create handlers via `createMiddlewareHandler` or `createHandler`.

```ts
import {
  createMiddlewareHandler,
  createHandler,
  type QuiltRequest,
} from '@quiltjs/quilt';

// Middleware-style handler that performs auth and returns user info
const authHandler = createMiddlewareHandler({
  id: 'auth',
  execute: async (req: QuiltRequest) => {
    const userId = req.headers['x-user-id'];
    if (!userId || Array.isArray(userId)) {
      throw new Error('Unauthorized');
    }
    return { userId };
  },
});

// Route handler that depends on authHandler
const profileHandler = createHandler({
  dependencies: { auth: authHandler },
  execute: async (_req, deps) => {
    return {
      profileId: deps.auth.userId,
      name: 'Jane Doe',
    };
  },
});
```

Handlers form a directed acyclic graph. Quilt:

- Topologically sorts the graph
- Ensures each handler runs at most once per request
- Caches outputs and injects them into downstream handlers as `deps`

### Requests and responses

Quilt introduces a small set of request/response types:

- `QuiltRequest` – base request type
- `SinglePartQuiltRequest` – JSON/URL-encoded request with a `body`
- `MultiPartQuiltRequest` – multipart/form-data with text fields and `File`s
- `QuiltResponse` – wraps an HTTP status and response body

The Fastify adapter converts:

- `req.headers`, `req.params`, `req.query`, `req.body` → `QuiltRequest`
- Multipart form-data into `MultiPartQuiltRequest.fields`

`createHandler` automatically wraps your return value in a `QuiltResponse` with status `200`. If you
need full control, you can construct and return a `QuiltResponse` yourself inside the handler chain.

### Routing

Routing is done via `Quilt` and `QuiltRouter`:

- `Quilt` defines HTTP verb helpers (`get`, `post`, `put`, `patch`, `delete`, `options`, `head`)
  and delegates to a `ServerEngineAdapter`.
- `QuiltRouter` describes a group of routes that share a `prefix`.

```ts
import { type QuiltRouter, createHandler } from '@quiltjs/quilt';

const pingHandler = createHandler({
  execute: async () => ({ ok: true }),
});

class HealthRouter implements QuiltRouter {
  readonly prefix = '';

  getRoutes() {
    return [
      {
        method: 'GET',
        path: '/status',
        handler: pingHandler,
      },
    ];
  }
}
```

Routers are registered with:

```ts
import { registerRouters } from '@quiltjs/quilt';

registerRouters(quilt, new HealthRouter());
```

---

## Error handling

You can centralize error handling with `Quilt#setErrorHandler`.

```ts
import { Quilt, QuiltResponse } from '@quiltjs/quilt';

const quilt = new Quilt(new FastifyEngineAdapter({ fastify: server }));

quilt.setErrorHandler((error: Error) => {
  // Map domain errors to HTTP responses
  if (error.message === 'Unauthorized') {
    return new QuiltResponse({ status: 401, body: { error: 'Unauthorized' } });
  }

  console.error(error);
  return new QuiltResponse({
    status: 500,
    body: { error: 'Internal Server Error' },
  });
});
```

Any uncaught error thrown from a handler chain will be passed to the error handler and translated
into a `QuiltResponse`.

---

## Multipart example

When `@fastify/multipart` is installed and registered, file uploads are exposed via
`MultiPartQuiltRequest`:

```ts
import {
  createHandler,
  MultiPartQuiltRequest,
  QuiltRequest,
} from '@quiltjs/quilt';

const uploadHandler = createHandler({
  execute: async (req: QuiltRequest) => {
    if (!req.isMultipart()) {
      return { error: 'Expected multipart/form-data' };
    }

    const fileField = req.fields['file'];
    if (!fileField || fileField instanceof String) {
      return { error: 'Missing file' };
    }

    // fileField is a `File` instance
    return { filename: fileField.name, size: fileField.size };
  },
});
```

---

## Custom adapters

Fastify and Express support are provided out of the box via `FastifyEngineAdapter` and
`ExpressEngineAdapter`, but you can integrate Quilt with any HTTP server by implementing
`ServerEngineAdapter<RequestType, ResponseType>` yourself.

---

## TypeScript configuration

Quilt is authored in TypeScript and ships declarations. A typical consumer `tsconfig.json` should
work fine as long as:

- The module system is ESM (e.g. `"module": "NodeNext"` or `"ESNext"`).
- `"moduleResolution"` is compatible with Node’s ESM resolution.
- `"strict": true` is enabled to get the most out of the types.

---

## License

Licensed under the ISC license.
