# Cloudflare Skill Store Source Sync

## Why

Desktop self-hosted sync includes custom Skill Store sources in `SyncSnapshot.storeSources.skills`. The Cloudflare Worker now preserves `storeSources` in D1, but the authenticated Cloudflare Web workspace does not restore those sources into its browser-local `skill-store` state. The data reaches Cloudflare but is not visible in the Web UI.

## Scope

- Preserve `SyncSnapshot.storeSources` in the Cloudflare Worker snapshot.
- Restore `storeSources.skills` into browser Skill Store state before the shared desktop renderer loads.
- Preserve unrelated browser-local Skill Store preferences.
- Continue loading the Web workspace if remote hydration fails.

## Non-goals

- Do not sync installed Plugin packages or Plugin library files.
- Do not add routes, D1 tables, or a second store-source schema.
- Do not make browser-local edits automatically overwrite the remote snapshot.

## Risk And Rollback

Hydration changes browser-local state only after authentication and only when the remote snapshot contains valid Skill Store source metadata. Removing the hydration call restores the previous local-only Web behavior; D1 snapshots remain compatible because the field is optional.
