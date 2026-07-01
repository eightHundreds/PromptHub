# Fix CLI Unified DB Path

## Why

The CLI currently opens `<userData>/prompthub.db`, while the desktop app now prefers `<userData>/data/prompthub.db`. Users invoking `prompthub --data-dir "$HOME/Library/Application Support/PromptHub/data" skill list` expect the CLI to read the same database as desktop, but the core CLI database entry still targets the legacy root DB path.

## Scope

- Align the shared core database resolver with the desktop canonical DB selection rule: prefer `data/prompthub.db`, fallback to root `prompthub.db`, create new DB at `data/prompthub.db`.
- Cover CLI skill listing/project-install behavior through CLI-facing regression tests.
- Do not migrate or move existing files in this change.

## Risks

- Existing CLI users with only a legacy root DB must continue to work.
- New isolated CLI test workspaces must create the DB under `data/`.
- If both DBs exist, the unified `data/prompthub.db` must win to match desktop.

## Rollback

Reverting the resolver restores legacy root DB behavior, but would reintroduce desktop/CLI split-brain reads.
