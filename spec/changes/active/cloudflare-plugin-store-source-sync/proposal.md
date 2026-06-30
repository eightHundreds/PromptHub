# Cloudflare Plugin Store Source Sync

## Why

Desktop self-hosted sync already includes custom store sources in `SyncSnapshot.storeSources`, but the Cloudflare Worker normalization step drops that field before persisting the snapshot to D1. As a result, Plugin Store custom sources and the selected source do not survive a Cloudflare push/pull cycle.

## Scope

- Preserve `SyncSnapshot.storeSources` in the Cloudflare Worker sync snapshot.
- Cover Plugin Store custom sources and `selectedSourceId` with a regression test.
- Ignore malformed non-object `storeSources` values consistently with other optional snapshot objects.

## Non-goals

- Do not add Plugin package/library/file synchronization in this change.
- Do not change the D1 schema; the existing `sync_snapshots.payload_json` remains the source of truth.
- Do not change Docker/Node self-hosted sync behavior.

## Risk And Rollback

The field increases the stored JSON only by the configured source metadata. Rollback is a one-line normalization removal; existing snapshots remain readable because the field is optional.
