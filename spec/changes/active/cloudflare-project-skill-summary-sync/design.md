# Design

## DES-001: Minimal Snapshot Contract

Add optional `projectSkillInventories` to `SyncSnapshot`. Each inventory is keyed by project ID and contains `skills: { name, linkedSkillId? }[]` plus optional scan time. Desktop derives it from persisted Project Skill scan state during self-hosted push.

Linking never uses display name alone. A My Skills ID is emitted only when directory fingerprint or normalized local/symlink target path matches.

## DES-002: Web Presentation

Desktop upload includes `settings.skillProjects`. Web startup hydrates inventories into browser `skill-store.projectScanState` before importing the shared renderer. Placeholder scan records contain synthetic non-filesystem identifiers and a `syncedSummaryOnly` marker. Linked summaries resolve through My Skills; unlinked summaries expose no detail/content actions.

## Verification

- `TEST-001`: desktop self-hosted push includes project settings and privacy-safe summaries.
- `TEST-002`: Worker normalization/D1 serialization preserves inventories.
- `TEST-003`: Web startup hydrates summaries and retains linked IDs without content or absolute Skill paths.

Trace: `FR-001 -> DES-001/DES-002 -> TEST-001/TEST-002/TEST-003 -> T-001/T-002/T-003`.
