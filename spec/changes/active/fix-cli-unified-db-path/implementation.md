# Implementation

## Status

Implemented and verified.

## Changes

- Added `getLegacyDatabasePath()` and `getDatabasePath()` to `packages/core/src/runtime-paths.ts`.
- Updated `packages/core/src/database.ts` so core/CLI database initialization prefers `<userData>/data/prompthub.db`, falls back to `<userData>/prompthub.db`, and creates new databases under `data/`.
- Added CLI regression tests for unified DB preference, legacy root fallback, and new workspace DB creation.

## Verification

- `pnpm --filter @prompthub/cli test -- tests/run.test.ts -t "prefers the unified data database"` failed before implementation with CLI reading `legacy-skill` from the root DB.
- `pnpm --filter @prompthub/cli test -- tests/run.test.ts` passed after implementation.
- `pnpm --filter @prompthub/cli test` passed: 57 tests.
- `pnpm --filter @prompthub/cli typecheck` passed.
- `pnpm --filter @prompthub/cli lint` passed.
- `pnpm --filter @prompthub/cli build` passed.

## Follow-ups

- None currently.
