# CLI Unified DB Path Design

## Current Boundary

- Owner: `packages/core` for shared runtime paths and database initialization; `apps/cli` consumes it via `runCli`.
- Source of truth: SQLite database plus Skill repositories under the configured user data root.
- Stable behavior: desktop prefers `<userData>/data/prompthub.db` and falls back to `<userData>/prompthub.db`.

## Approach

Add shared core helpers mirroring the desktop database path contract:

1. `getLegacyDatabasePath()` returns `<userData>/prompthub.db`.
2. `getDatabasePath()` returns `<userData>/data/prompthub.db` when present, otherwise legacy root DB when present, otherwise unified data DB for new installs.
3. `initDatabase()` uses `getDatabasePath()`.

This keeps CLI, shared core workflows, and tests on the same path contract without duplicating CLI-specific database logic.

## Data / Contract Impact

- SQLite path selection changes for `packages/core` consumers.
- No schema changes, migrations, IPC, route, or shared type changes.
- Filesystem layout semantics are aligned with the existing desktop data layout.

## Verification

- CLI regression test with both root and unified DBs proves unified path wins.
- CLI regression test with only root DB proves legacy fallback remains.
- Existing CLI lifecycle tests prove new workspaces still initialize correctly.
- Run CLI test, typecheck, lint, and build where available.
