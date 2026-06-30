# Design

## Current Flow

Plugin Store sources are renderer-owned persisted state. Desktop backup exports them as `SyncSnapshot.storeSources`; self-hosted sync sends that snapshot to `/api/sync/data`; Cloudflare stores the normalized snapshot as JSON in D1 `sync_snapshots.payload_json`; a later pull restores the source state into desktop local storage.

The Worker currently breaks this flow because `normalizeSnapshot()` constructs a new object without copying `storeSources`.

## DES-001: Preserve The Existing Shared Contract

Add the optional `storeSources` object to the existing Cloudflare normalization result. No new adapter, route, table, or migration is required because:

- `SyncSnapshot` already owns the shared contract.
- D1 already stores the complete normalized snapshot as JSON.
- desktop export, merge, pull, and restore already handle the field.

Non-object runtime values are omitted. Detailed shape validation remains owned by the existing desktop backup/import boundary; this change does not introduce a second competing source schema in the Worker.

## Data And Compatibility

- Source of truth: D1 `sync_snapshots.payload_json` for the remote snapshot; desktop persisted renderer state after restore.
- Schema delta: none.
- Compatibility: `storeSources` remains optional, so older snapshots and clients continue to work.
- Failure behavior: malformed non-object values are not persisted.

## Verification

- `TEST-001`: normalize and serialize a snapshot for D1 containing a Plugin Store source and selected ID; assert exact preservation in `payload_json`.
- `TEST-002`: normalize a snapshot containing a primitive `storeSources`; assert omission.

Traceability: `FR-001 -> DES-001 -> TEST-001/TEST-002`.
