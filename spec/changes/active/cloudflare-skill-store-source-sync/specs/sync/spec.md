# Sync Delta

## Added Requirements

### FR-001: Cloudflare preserves custom store source metadata

The Cloudflare self-hosted sync backend MUST preserve `storeSources` when accepting and returning a sync snapshot.

#### AC-001: Skill custom sources survive D1 serialization

- **GIVEN** a desktop snapshot contains `storeSources.skills`
- **WHEN** the Worker normalizes and persists the snapshot
- **THEN** its custom sources and selected source remain unchanged.

### FR-002: Cloudflare Web presents synced Skill Store sources

The authenticated Web workspace MUST restore valid remote `storeSources.skills` before loading the shared desktop renderer.

#### AC-002: Remote sources appear in the Web Skill Store

- **GIVEN** `/api/sync/data` returns custom Skill Store sources
- **WHEN** the authenticated Web workspace starts
- **THEN** it writes those sources and the selected source into browser `skill-store` state
- **AND** preserves unrelated persisted Skill Store preferences.

#### AC-003: Missing or malformed data is non-destructive

- **GIVEN** the remote snapshot omits `storeSources.skills`, contains malformed source records, or cannot be fetched
- **WHEN** the Web workspace starts
- **THEN** existing browser Skill Store state remains unchanged
- **AND** the workspace still loads.
