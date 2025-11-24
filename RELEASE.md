# Release checklist

This project is published as `@quiltjs/quilt` on npm. Before cutting a new version, run through this quick checklist.

1. **Decide the version bump**

   - Update `package.json` `"version"` appropriately (`patch`, `minor`, or `major`).

2. **Update the changelog**

   - Add a new section to `CHANGELOG.md` matching the version.
   - Briefly describe any API additions/changes and notable docs/examples updates.

3. **Verify build and tests**

   - Run `npm test` (build + node `--test` suite).
   - Run `npm run test:types` (type-level tests under `test-types/`).
   - Optionally run `npx eslint src test-types --ext .ts` to check linting.

4. **Sanity-check the package contents**

   - Ensure `dist/` is freshly built (`npm run build`).
   - Confirm `package.json` `files` only includes what you intend to ship (currently `dist` and `README.md`).

5. **Publish**

   - Login to npm if needed: `npm login`.
   - Publish from the repo root: `npm publish`.

6. **Post-release**
   - Tag the release in git (for example, `v0.x.y`) and push tags.
   - Optionally announce the release (changelog link, README highlights, examples) wherever you share project updates.
