# @quiltjs/quilt

<p align="center">
  <img src="assets/quilt.png" alt="Quilt logo" width="160" />
</p>

Lightweight, type-safe request handling and routing for Node HTTP servers, with first-class Fastify and Express support.

`@quiltjs/quilt` lets you build HTTP APIs from small, composable, strongly-typed “handlers”
instead of ad-hoc middleware that mutates `req`/`res`. It is designed to be framework-agnostic and
to sit cleanly on top of your HTTP server of choice.

- Strong TypeScript types for handlers and their dependencies
- Explicit dependency graph instead of “magic” middleware ordering
- Framework abstraction via `ServerEngineAdapter` (Fastify and Express adapters included)
- Simple routing via `Quilt`
- JSON and form-data support via your framework's middleware

---

## Why Quilt?

Quilt gives you a clearer alternative to traditional middleware. Instead of relying on ordering and mutation, you build request logic from small, typed handlers with explicit dependencies. No decorators, no global DI, no FP overhead — just predictable composition.

- Explicit dependencies — handlers declare what they need; Quilt runs them once per request and injects the results.
- Plain async functions — no decorators, classes, or schema systems required.
- Framework-agnostic — works with Fastify, Express, or any HTTP server via a tiny adapter.
- Consistent request/response model — JSON, URL-encoded, and multipart handled the same way.
- Composable by design — auth, loading, validation, and business logic stay small and reusable.

If you want strong types and predictable composition without adopting a whole new framework, Quilt is designed for exactly that.

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
import { Quilt, FastifyEngineAdapter, createHandler } from '@quiltjs/quilt';

const server = fastify();

const quilt = new Quilt(new FastifyEngineAdapter({ fastify: server }));

// Simple handler that writes a JSON response
const helloHandler = createHandler({
  execute: async ({ req, res }) => {
    res.code(200).send({ message: `Hello, ${req.query.name ?? 'world'}!` });
  },
});

quilt.get('/api/hello', helloHandler);

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
import { Quilt, ExpressEngineAdapter, createHandler } from '@quiltjs/quilt';

const app = express();
app.use(express.json());

const quilt = new Quilt(new ExpressEngineAdapter({ app }));

const helloHandler = createHandler({
  execute: async ({ req, res }) => {
    res.status(200).json({
      message: `Hello, ${req.query.name ?? 'world'}!`,
    });
  },
});

quilt.get('/api/hello', helloHandler);

quilt.listen(3000, () => {
  console.log('Server listening on http://localhost:3000');
});
```

---

## Quick start (Node http)

```ts
import http from 'node:http';
import { Quilt, NodeHttpEngineAdapter, createHandler } from '@quiltjs/quilt';

const adapter = new NodeHttpEngineAdapter();
const quilt = new Quilt(adapter);

const helloHandler = createHandler({
  execute: async ({ req, res }) => {
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        message: `Hello, ${req.query.name ?? 'world'}!`,
      }),
    );
  },
});

quilt.get('/api/hello/:name', helloHandler);

adapter.listen(3000, () => {
  console.log('Server listening on http://localhost:3000');
});
```

---

## Core concepts

### Handlers

A **handler** is a small unit of work that:

- Receives a context object (for HTTP adapters this is `{ req, res }`)
- Optionally depends on other handlers
- Produces an output that downstream handlers can consume

You usually create handlers via `createMiddlewareHandler` or `createHandler`.

```ts
import { createMiddlewareHandler, createHandler } from '@quiltjs/quilt';

type RequestContext = {
  headers: Record<string, string | string[] | undefined>;
};

// Middleware-style handler that performs auth and returns user info
const authHandler = createMiddlewareHandler({
  id: 'auth',
  execute: async (ctx: RequestContext) => {
    const userId = ctx.headers['x-user-id'];
    if (!userId || Array.isArray(userId)) {
      throw new Error('Unauthorized');
    }
    return { userId };
  },
});

// Handler that depends on authHandler
const profileHandler = createHandler({
  dependencies: { auth: authHandler },
  execute: async (_ctx, deps) => {
    return {
      profileId: deps.auth.userId,
      name: 'Jane Doe',
    };
  },
});

// Execute the graph over any context object you choose
await executeHandler(profileHandler, {
  headers: incomingHeaders,
});
```

Handlers form a directed acyclic graph. Quilt:

- Topologically sorts the graph
- Ensures each handler runs at most once per request
- Caches outputs and injects them into downstream handlers as `deps`

### Requests and responses

In practice you will usually model your **own** application-level input/output types and treat
handlers as an orchestration layer:

- At the edge, handlers receive a context (for HTTP adapters this is `{ req, res }`).
- They translate framework-specific request data into your own DTOs and call domain functions.
- They write the HTTP response using the native framework APIs (`res.json`, `reply.send`, etc.).

### Routing

Routing is done via `Quilt`:

- `Quilt` defines HTTP verb helpers (`get`, `post`, `put`, `patch`, `delete`, `options`, `head`)
  and delegates to a `ServerEngineAdapter`.

```ts
import { createHandler } from '@quiltjs/quilt';

const pingHandler = createHandler({
  execute: async () => ({ ok: true }),
});

quilt.get('/status', pingHandler);
```

---

## Error handling

You can centralize error handling with `Quilt#setErrorHandler`.

```ts
import { FastifyEngineAdapter, Quilt } from '@quiltjs/quilt';

const quilt = new Quilt(new FastifyEngineAdapter({ fastify: server }));

quilt.setErrorHandler((error: Error, { res }) => {
  // Map domain errors to HTTP responses
  if (error.message === 'Unauthorized') {
    res.code(401).send({ error: 'Unauthorized' });
    return;
  }

  console.error(error);
  res.code(500).send({ error: 'Internal Server Error' });
});
```

Any uncaught error thrown from a handler chain will be passed to the error handler and you can use
the underlying framework response object to generate an appropriate HTTP response.

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
