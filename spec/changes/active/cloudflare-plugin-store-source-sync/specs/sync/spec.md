# Sync Delta

## Added Requirements

### FR-001: Cloudflare preserves Plugin Store source configuration

The Cloudflare self-hosted sync backend MUST preserve `storeSources` when accepting and returning a sync snapshot.

#### AC-001: Plugin custom sources survive normalization

- **GIVEN** a desktop snapshot contains `storeSources.plugins.customStoreSources`
- **AND** it contains `storeSources.plugins.selectedSourceId`
- **WHEN** the Cloudflare Worker normalizes the snapshot for D1 persistence
- **THEN** both values remain unchanged in the normalized snapshot.

#### AC-002: Malformed source configuration is not persisted

- **GIVEN** `storeSources` is a non-object value
- **WHEN** the Cloudflare Worker normalizes the snapshot
- **THEN** `storeSources` is omitted.
