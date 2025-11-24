# @quiltjs/quilt

<p align="center">
  <img src="assets/quilt.png" alt="Quilt logo" width="160" />
</p>

Lightweight, type-safe request handling and routing for Node HTTP servers, with first-class Fastify and Express support.

Quilt’s core idea is simple: **model each request as a dependency graph of small handlers**. Auth, validation, and loading run once per request and feed into your route handler via strong types, instead of being scattered across ad-hoc middleware.

<p align="center">
  <a href="https://www.npmjs.com/package/@quiltjs/quilt"><img src="https://img.shields.io/npm/v/@quiltjs/quilt.svg" alt="npm version" /></a>
  <img src="https://img.shields.io/node/v/@quiltjs/quilt.svg" alt="node compatibility" />
  <img src="https://img.shields.io/npm/l/@quiltjs/quilt.svg" alt="license: ISC" />
</p>

`@quiltjs/quilt` lets you build HTTP APIs from small, composable, strongly-typed “handlers”
instead of ad-hoc middleware that mutates `req`/`res`. It is designed to be framework-agnostic and
to sit cleanly on top of your HTTP server of choice.

- Strong TypeScript types for handlers and their dependencies
- Explicit dependency graph instead of “magic” middleware ordering
- Framework abstraction via `ServerEngineAdapter` (Fastify and Express adapters included)
- Simple routing via `Quilt`
- JSON and form-data support via your framework's middleware

At a glance, Quilt replaces chains of middleware like:

```ts
app.get('/profile', authMiddleware, loadUserMiddleware, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  res.json({ id: req.user.id, name: req.user.name });
});
```

with a small, typed dependency graph:

```ts
const authHandler = createHandler({
  execute: async ({ req }) => {
    const userId = req.headers['x-user-id'];
    if (!userId || Array.isArray(userId)) {
      throw new Error('Unauthorized');
    }
    return { userId };
  },
});

const loadUserHandler = createHandler({
  dependencies: { auth: authHandler },
  execute: async (_ctx, deps) => {
    const user = await loadUserById(deps.auth.userId);
    if (!user) {
      throw new Error('NotFound');
    }
    return user;
  },
});

const profileRouteHandler = createHandler({
  dependencies: { user: loadUserHandler },
  execute: async ({ res }, deps) => {
    res.status(200).json({
      id: deps.user.id,
      name: deps.user.name,
    });
  },
});

quilt.get('/profile', profileRouteHandler);
```

Each handler is reusable, testable on its own, and runs at most once per request (even if multiple downstream handlers depend on it).

## TL;DR

You keep Fastify/Express/Node HTTP and write small, typed handlers instead of ad-hoc middleware:

```ts
import fastify from 'fastify';
import {
  Quilt,
  FastifyEngineAdapter,
  createHandler,
  type FastifyHttpContext,
} from '@quiltjs/quilt';

const app = fastify();
const quilt = new Quilt(new FastifyEngineAdapter({ fastify: app }));

const hello = createHandler({
  execute: async ({ req, res }: FastifyHttpContext) => {
    res.code(200).send({ message: `Hello, ${req.query.name ?? 'world'}!` });
  },
});

quilt.get('/api/hello', hello);
```

---

## Status

Quilt is currently in **early but production-ready** shape:

- Core concepts (handlers, dependency graphs, adapters) are stable.
- The public API surface is intentionally small and is expected to evolve carefully.
- Breaking changes, when needed before `1.0`, will be documented in `CHANGELOG.md`.
- Fastify and Express adapters are the primary, stable integrations; the Node HTTP adapter is a minimal but production-friendly option for simple HTTP servers.

Feedback and real-world usage reports are very welcome via GitHub issues.

---

## API reference (overview)

This is a quick overview of the main exports. See the rest of this README for patterns and examples.

- `createHandler` – defines a handler with optional dependencies and an `execute` function.
- `executeHandler` – runs a handler graph for an arbitrary context (not just HTTP).
- `Quilt` – routes HTTP methods (`get`, `post`, `put`, `patch`, `delete`, `options`, `head`) to handlers and lets you set a central error handler via `setErrorHandler`.

Types:

- `Handler<O, Ctx, D>` – typed description of a handler’s output, context, and dependencies.
- `HandlerOutputs<D>` – maps a handler’s `dependencies` to the inferred `deps` type.
- `HttpContext<Req, Res>` – convenience type for `{ req, res }` contexts.
- `FastifyHandler` / `ExpressHandler` – handler aliases for the Fastify and Express HTTP contexts.
- `NodeHttpHandlerContext` / `NodeHttpHandler` / `createNodeHttpRouteHandler` – helpers for Node HTTP contexts with typed `params`, `query`, and `body`.
- `HTTPMethod` – union of supported HTTP methods.
- `ServerEngineAdapter<Req, Res>` – interface adapters implement to plug Quilt into different HTTP engines.

Adapters:

- `FastifyEngineAdapter` / `FastifyHttpContext` – Fastify integration (`req` / `reply`).
- `ExpressEngineAdapter` / `ExpressHttpContext` – Express integration (`Request` / `Response`).
- `NodeHttpEngineAdapter` / `NodeHttpContext` / `NodeHttpRequest` – minimal adapter for Node’s built-in `http` module.

All of these are exported from the main entrypoint:

```ts
import {
  Quilt,
  createHandler,
  executeHandler,
  FastifyEngineAdapter,
  type FastifyHttpContext,
  ExpressEngineAdapter,
  type ExpressHttpContext,
  NodeHttpEngineAdapter,
  type NodeHttpContext,
  type NodeHttpRequest,
} from '@quiltjs/quilt';
```

You rarely need every export in a single file, but this shows the surface area at a glance.

---

## Who is Quilt for?

Quilt is aimed at TypeScript teams who:

- Already use Fastify, Express, or Node's `http` module.
- Have grown past a handful of routes and are feeling middleware sprawl.
- Want predictable composition and strong types without adopting a whole new framework.

It works best for medium-sized HTTP APIs where:

- You want to factor shared concerns (auth, validation, loading) into small, reusable units.
- You want to reuse those units across routes without copy-paste.
- You still want to keep the underlying framework and its ecosystem.

### When Quilt is (and isn’t) a good fit

Quilt is a good fit when:

- You have more than “a few” routes and shared concerns like auth, validation, and loading logic.
- You want to keep Fastify/Express/Node HTTP, but make request logic more explicit and testable.
- You care about strong TypeScript types across your request pipeline.

Quilt is probably not the right tool when:

- You have a tiny app with only a handful of routes and simple logic.
- You’re already all-in on a batteries-included framework like NestJS, Next.js API routes, or Remix and are happy with their patterns.
- You don’t need shared handler reuse or dependency graphs beyond what simple middleware already gives you.

---

## Why Quilt?

Quilt gives you a clearer alternative to traditional middleware. Instead of relying on ordering and mutation, you build request logic from small, typed handlers with explicit dependencies. No decorators, no global DI, no FP overhead — just predictable composition.

- Explicit dependencies — handlers declare what they need; Quilt runs them once per request and injects the results.
- Plain async functions — no decorators, classes, or schema systems required.
- Framework-agnostic — works with Fastify, Express, or any HTTP server via a tiny adapter.
- Consistent handler model across frameworks — the same dependency graph pattern works everywhere.
- Composable by design — auth, loading, validation, and business logic stay small and reusable.

If you want strong types and predictable composition without adopting a whole new framework, Quilt is designed for exactly that.

### Quilt vs other approaches

- **Plain Express/Fastify middleware** – Great for small apps but scales poorly as logic is hidden in implicit ordering and `req`/`res` mutation. Quilt keeps your chosen framework but introduces explicit, typed dependencies instead of shared mutation.
- **Full frameworks (e.g. NestJS)** – Provide batteries included (modules, DI, decorators). Quilt stays much smaller: you keep your framework and ecosystem, and only adopt a focused composition layer.
- **RPC stacks (e.g. tRPC)** – Optimised for tightly-coupled client/server TypeScript. Quilt is HTTP-first and framework-agnostic; it plays nicely with any client, not just TS.
- **FP-heavy ecosystems** – If you like simple async functions more than algebraic effects or type-level wizardry, Quilt is intentionally minimal.

## Installation

Fastify:

```bash
npm install @quiltjs/quilt fastify
# or
pnpm add @quiltjs/quilt fastify
```

Express:

```bash
npm install @quiltjs/quilt express
# or
pnpm add @quiltjs/quilt express
```

Fastify/Express are peer dependencies because Quilt can be used with other HTTP engines via custom
adapters. They are marked as optional peers so you only need to install the stack you actually use:

- Using **Express** only: install `express@^4.18.2` or `express@^5.0.0` and ensure your `@types/express` major version matches your Express major version.
- Using **Fastify** only: install `fastify@^4.25.2` (and `@fastify/multipart` if you need multipart).
- Using a **custom adapter**: you do not need Express or Fastify at all.

### TypeScript / ESM quickstart

Quilt is published as ESM-only. For a typical TypeScript + Node 18+ project, a minimal `tsconfig.json` that works well with Quilt looks like:

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

Make sure your `package.json` is also configured for ESM (for example, `"type": "module"`), so you can use standard `import`/`export` syntax with `@quiltjs/quilt`.

## Quick start (Fastify)

```ts
import fastify from 'fastify';
import { Quilt, FastifyEngineAdapter, createHandler } from '@quiltjs/quilt';

const server = fastify();

const quilt = new Quilt(new FastifyEngineAdapter({ fastify: server }));

// Simple handler that writes a JSON response with typed context
const helloHandler = createHandler({
  execute: async ({ req, res }: FastifyHttpContext) => {
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

For a runnable example you can clone and start immediately, see
`examples/fastify-starter` in this repo.

---

## Quick start (Express)

```ts
import express from 'express';
import {
  Quilt,
  ExpressEngineAdapter,
  createHandler,
  type ExpressHttpContext,
} from '@quiltjs/quilt';

const app = express();
app.use(express.json());

const quilt = new Quilt(new ExpressEngineAdapter({ app }));

const helloHandler = createHandler({
  execute: async ({ req, res }: ExpressHttpContext) => {
    res.status(200).json({
      message: `Hello, ${req.query.name ?? 'world'}!`,
    });
  },
});

quilt.get('/api/hello', helloHandler);

app.listen(3000, () => {
  console.log('Server listening on http://localhost:3000');
});
```

See `examples/express-starter` for a complete runnable Express starter.

---

## Quick start (Node http)

```ts
import http from 'node:http';
import {
  Quilt,
  NodeHttpEngineAdapter,
  createNodeHttpRouteHandler,
  type NodeHttpHandlerContext,
} from '@quiltjs/quilt';

const adapter = new NodeHttpEngineAdapter();
const quilt = new Quilt(adapter);

type HelloParams = { name: string | undefined };
type HelloQuery = { search: string | undefined };
type HelloBody = { value: number };

const helloHandler = createNodeHttpRouteHandler<
  void,
  HelloParams,
  HelloQuery,
  HelloBody
>({
  execute: async ({ req, res }: NodeHttpHandlerContext<
    HelloParams,
    HelloQuery,
    HelloBody
  >) => {
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

See `examples/node-http-starter` for a complete runnable Node HTTP starter.

---

### Node HTTP metadata escape hatch

For most application data, Quilt encourages you to use handlers and their
dependencies (`deps`) rather than mutating the request object. However,
some cross-cutting concerns (logging, tracing, correlation IDs) are easier
to handle via per-request metadata.

The Node HTTP adapter exposes an optional `locals` bag on `NodeHttpRequest`:

```ts
export type NodeHttpRequest = IncomingMessage & {
  params: Record<string, string | undefined>;
  query: Record<string, string | undefined>;
  body: unknown;
  locals?: Record<string, unknown>;
};
```

You can treat this as an **escape hatch** for infrastructure metadata:

```ts
const requestIdHandler = createNodeHttpRouteHandler({
  execute: async ({ req }) => {
    const requestId = crypto.randomUUID();
    req.locals ??= {};
    req.locals.requestId = requestId;
    return { requestId };
  },
});

const routeHandler = createNodeHttpRouteHandler({
  dependencies: { requestId: requestIdHandler },
  execute: async ({ req, res }, deps) => {
    console.log('handling', deps.requestId);
    // ...
  },
});

quilt.get('/api/with-request-id', routeHandler);
```

In the error handler you can read the same metadata via `req.locals`:

```ts
quilt.setErrorHandler((error, { req, res }) => {
  const requestId = req.locals?.requestId;
  console.error('error for request', requestId, error);
  // map error to HTTP response ...
});
```

We recommend using `locals` only for infrastructure concerns (logging,
tracing, correlation IDs). Business data should continue to flow through
handlers and their `deps` so that dependencies remain explicit and
type-safe.

---

## Examples

Clone this repo and explore:

- `examples/fastify-starter` – minimal Fastify + Quilt server with auth and error handling.
- `examples/express-starter` – minimal Express + Quilt server using JSON responses and typed errors.
- `examples/node-http-starter` – minimal Node HTTP + Quilt server with adapter-based routing and typed errors.
- `examples/multi-route-api` – Fastify API with multiple routes sharing auth/validation/loading handlers across files.

---

## Core concepts

### Handlers

A **handler** is a small unit of work that:

- Receives a context object (for HTTP adapters this is `{ req, res }`)
- Optionally depends on other handlers
- Produces an output that downstream handlers can consume

You usually create handlers via `createHandler`.

```ts
import { createHandler } from '@quiltjs/quilt';

type RequestContext = {
  headers: Record<string, string | string[] | undefined>;
};

// Middleware-style handler that performs auth and returns user info
const authHandler = createHandler({
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
```

Handlers form a directed acyclic graph. Quilt:

- Topologically sorts the graph
- Ensures each handler runs at most once per request
- Caches outputs and injects them into downstream handlers as `deps`

### Type safety and handler outputs

Handlers are fully typed based on their dependencies. Quilt's `HandlerOutputs` type maps the `dependencies`
object into a strongly-typed `deps` parameter:

```ts
import { createHandler, type Handler } from '@quiltjs/quilt';

type RequestContext = { requestId: string };

const requestIdHandler = createHandler({
  execute: async (ctx: RequestContext) => ctx.requestId,
});

const userHandler = createHandler({
  dependencies: { requestId: requestIdHandler },
  execute: async (_ctx: RequestContext, deps) => {
    // deps.requestId is inferred as string
    const id = deps.requestId;
    return { id };
  },
});

const routeHandler: Handler<
  void,
  RequestContext,
  { user: typeof userHandler }
> = createHandler({
  dependencies: { user: userHandler },
  execute: async (_ctx, deps) => {
    // deps.user.id is inferred as string
    const ok: string = deps.user.id;

    // @ts-expect-error user.id is not a number
    const bad: number = deps.user.id;
    void ok;
    void bad;
  },
});
```

If you change `requestIdHandler` to return a number, TypeScript will flag all downstream usages,
giving you a compile-time safety net over the entire handler graph.

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

## Opinionated patterns

Quilt is most useful when you factor shared concerns into small, reusable handlers and compose them per route. These are the patterns we recommend in real apps.

### 1. Domain errors for auth/validation/loading

Define a small set of domain errors once and reuse them across handlers:

```ts
class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized');
    this.name = 'UnauthorizedError';
  }
}

class BadRequestError extends Error {
  constructor(message = 'Bad request') {
    super(message);
    this.name = 'BadRequestError';
  }
}

class NotFoundError extends Error {
  constructor(message = 'Not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}
```

### 2. Auth + validation + loading + response

Use small handlers for each concern and compose them:

```ts
import { createHandler } from '@quiltjs/quilt';
import { z } from 'zod';

// 1. Auth: derive user id from the request
const authHandler = createHandler({
  execute: async ({ req }) => {
    const userId = req.headers['x-user-id'];
    if (!userId || Array.isArray(userId)) {
      throw new UnauthorizedError();
    }
    return { userId };
  },
});

// 2. Validation: check input shape with Zod
const ParamsSchema = z.object({
  id: z.string().min(1),
});

const validateParamsHandler = createHandler({
  execute: async ({ req }) => {
    const result = ParamsSchema.safeParse(req.params);
    if (!result.success) {
      throw new BadRequestError('Invalid id parameter');
    }
    // result.data is strongly typed based on schema
    return result.data;
  },
});

// 3. Loading: fetch data based on validated input + auth
const loadOrderHandler = createHandler({
  dependencies: { auth: authHandler, params: validateParamsHandler },
  execute: async (_ctx, deps) => {
    const order = await loadOrderForUser({
      userId: deps.auth.userId,
      orderId: deps.params.id,
    });
    if (!order) {
      throw new NotFoundError('Order not found');
    }
    return order;
  },
});

// 4. Business logic + HTTP response
const getOrderRoute = createHandler({
  dependencies: { order: loadOrderHandler },
  execute: async ({ res }, deps) => {
    res.status(200).json({
      id: deps.order.id,
      total: deps.order.total,
    });
  },
});

quilt.get('/api/orders/:id', getOrderRoute);
```

Each handler does one thing and can be reused across routes (for example, `authHandler` and `validateParamsHandler`).

Quilt does not ship its own schema or validation library on purpose. Instead, it is designed to work
with popular tools like Zod, Yup, Valibot, or your own validation layer.

### 3. Central error handler (short-circuiting)

Map domain errors to HTTP responses in one place:

```ts
import { Quilt, FastifyEngineAdapter } from '@quiltjs/quilt';

const quilt = new Quilt(new FastifyEngineAdapter({ fastify: server }));

quilt.setErrorHandler((error, { res }) => {
  if (error instanceof UnauthorizedError) {
    res.code(401).send({ error: 'Unauthorized' });
    return;
  }

  if (error instanceof BadRequestError) {
    res.code(400).send({ error: error.message });
    return;
  }

  if (error instanceof NotFoundError) {
    res.code(404).send({ error: error.message });
    return;
  }

  console.error(error);
  res.code(500).send({ error: 'Internal Server Error' });
});
```

If any handler throws, Quilt stops executing the graph and passes the error to your error handler. This is the recommended way to “short-circuit” a request based on auth, validation, or domain checks.

The same pattern works with Express via `res.status(...).json(...)`.

---

## Custom adapters

Fastify and Express support are provided out of the box via `FastifyEngineAdapter` and
`ExpressEngineAdapter`, but you can integrate Quilt with any HTTP server by implementing
`ServerEngineAdapter<RequestType, ResponseType>` yourself.

---

## Observability

### Handler hooks

Both `executeHandler` and `Quilt` expose lightweight hooks you can use for logging, metrics, or tracing.

- `executeHandler(handler, ctx, hooks)` accepts an optional `ExecuteHandlerHooks<Ctx>`.
- `Quilt` instances support `quilt.setHooks(hooks)`, where `hooks` has the same shape as `ExecuteHandlerHooks<HttpContext<Req, Res>>`.

Hooks are called once per handler execution with basic timing information:

- `onHandlerStart({ handler, ctx })`
- `onHandlerSuccess({ handler, ctx, durationMs, output })`
- `onHandlerError({ handler, ctx, durationMs, error })`

Example (Fastify):

```ts
import fastify from 'fastify';
import { Quilt, FastifyEngineAdapter, createHandler } from '@quiltjs/quilt';

const app = fastify();
const quilt = new Quilt(new FastifyEngineAdapter({ fastify: app }));

quilt.setHooks({
  onHandlerSuccess: ({ durationMs }) => {
    console.log(`[quilt] handler took ${durationMs.toFixed(3)}ms`);
  },
});

const helloHandler = createHandler({
  execute: async ({ req, res }) => {
    res.code(200).send({ message: `Hello, ${req.query.name ?? 'world'}!` });
  },
});

quilt.get('/api/hello', helloHandler);
```

If you use `executeHandler` directly (outside HTTP), you can pass `hooks` as the third argument:

```ts
await executeHandler(handler, ctx, {
  onHandlerSuccess: ({ durationMs }) => {
    console.log('handler finished in', durationMs, 'ms');
  },
});
```

## TypeScript configuration

Quilt is authored in TypeScript and ships declarations. A typical consumer `tsconfig.json` should
work fine as long as:

- The module system is ESM (for example `"module": "NodeNext"`, `"Node16"`, or `"ESNext"`).
- `"moduleResolution"` is compatible with Node-style ESM or modern bundlers (for example `"NodeNext"`, `"Node16"`, or `"bundler"`).
- `"strict": true` is enabled to get the most out of the types.

Quilt targets modern Node runtimes (Node 18+). It does not start your HTTP
server for you; instead, you should call your framework or adapter’s own
`listen` method (for example, `app.listen` for Express or Fastify, or
`adapter.listen` when using the Node HTTP adapter).

### Using from CommonJS

`@quiltjs/quilt` is published as ESM-only. In ESM modules you can import it as usual:

```ts
import { Quilt, FastifyEngineAdapter, createHandler } from '@quiltjs/quilt';
```

In a CommonJS module (for example, an existing Node app that still uses `require`), you can load Quilt via dynamic `import()`:

```js
// commonjs-app.js
async function main() {
  const { Quilt, FastifyEngineAdapter, createHandler } = await import(
    '@quiltjs/quilt'
  );

  // use Quilt as normal here
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

If you use TypeScript, we recommend configuring your project for ESM (`"module": "NodeNext"` or `"ESNext"`) so that your `.ts` files can use standard `import`/`export` syntax with Quilt.

---

## License

Licensed under the ISC license.
