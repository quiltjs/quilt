# Changelog

All notable changes to this project will be documented in this file.

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
