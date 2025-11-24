# Changelog

All notable changes to this project will be documented in this file.

## 0.2.3

- Added an optional `locals` bag to `NodeHttpRequest` as an escape hatch for per-request infrastructure metadata (for example, logging/tracing request IDs), and documented its intended usage in the README.
- Kept application data flow centered on handlers and their dependencies; `locals` is recommended only for cross-cutting concerns.

## 0.2.2

- Added `createNodeHttpRouteHandler` helper for Node HTTP to make it easier to define handlers with typed `params`, `query`, and `body` while remaining compatible with `Quilt`’s routing API.
- Documented the Node HTTP typed route helper in the README and adjusted the Node HTTP quickstart example to showcase typed `params`/`query`/`body`.
- Relaxed TypeScript configuration guidance in the README to mention other compatible module/moduleResolution settings (`Node16`, `bundler`) in addition to `NodeNext`.

## 0.2.1

- Improved `Quilt` routing methods (`get`, `post`, etc.) to preserve handler dependency types per call, removing the need for casts when using concrete dependency maps.
- Broadened Express peer dependency support to include Express 5 (`express@^4.18.2 || ^5.0.0`) and documented the expectation that `@types/express` matches the Express major version.

## 0.2.0

- Simplified handler API by removing the optional `id` field from `Handler` and `createHandler` options; handler identity for execution and caching is now based solely on handler object identity.
- Clarified and aligned README and examples with the streamlined API (no `id` usage in core examples, smaller surface area).
- Added tests for `executeHandler` hooks (start/success/error) and `Quilt.setHooks` to verify observability behavior.
- Extended `NodeHttpEngineAdapter` tests to cover invalid JSON request bodies and ensure the raw body is exposed when parsing fails.

## 0.1.1

- Typed HTTP context exports for adapters (`FastifyHttpContext`, `ExpressHttpContext`, `NodeHttpContext`, `NodeHttpRequest`).
- README improvements: clearer “Why Quilt?” story, Express before/after example, minimal API reference, ESM/CommonJS usage notes, and trimmed examples.
- Release process docs via `RELEASE.md`.

## 0.1.0

- Initial public release of `@quiltjs/quilt`.
- Core handler/graph execution (`createHandler`, `executeHandler`) and `Quilt` router.
- Fastify, Express, and Node HTTP adapters.
- Initial examples and README documentation.
