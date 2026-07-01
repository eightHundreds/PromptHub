# Design

## Current Flow

Desktop exports custom Skill Store sources into `SyncSnapshot.storeSources.skills`. Cloudflare persists the normalized snapshot in D1 `sync_snapshots.payload_json`. The Web client already has authenticated access to `GET /api/sync/data`, but its embedded desktop renderer hydrates the `skill-store` Zustand state only from browser local storage.

## DES-001: Preserve The Shared Snapshot Contract

The Worker copies the optional `storeSources` object during normalization. No database migration is required because D1 stores the complete normalized snapshot as JSON.

## DES-002: Hydrate Before Desktop Renderer Import

The Web workspace fetches `/api/sync/data`, validates `storeSources.skills`, and merges it into the existing persisted `skill-store` envelope. The shared desktop renderer becomes a lazy import rendered only after this attempt completes, so Zustand reads the hydrated browser state on first initialization.

The merge replaces only `customStoreSources` and, when present, `selectedStoreSourceId`. View mode, filters, caches, and other browser-local preferences remain unchanged. Fetch or validation failure logs a warning and falls back to existing local state.

## Data And Compatibility

- Remote source of truth: D1 `sync_snapshots.payload_json`.
- Web presentation state: browser local storage key `skill-store`.
- Schema/API delta: none.
- Compatibility: missing optional source metadata preserves current local Web state.

## Verification

- `TEST-001`: Worker D1 serialization preserves store-source metadata.
- `TEST-002`: authenticated Web startup restores remote Skill sources and selected ID while preserving another local preference.
- `TEST-003`: missing remote source metadata leaves local state unchanged and still renders the workspace.

Traceability: `FR-001 -> DES-001 -> TEST-001 -> T-001`; `FR-002 -> DES-002 -> TEST-002/TEST-003 -> T-002/T-003`.
