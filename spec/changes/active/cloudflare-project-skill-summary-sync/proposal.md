# Cloudflare Project Skill Summary Sync

## Why

Project Skills are derived from desktop filesystem scans. Cloudflare Web cannot access those local directories, so the module currently shows no projects or skills after desktop sync.

## Scope

- Sync project names and configured paths through settings.
- Sync a minimal per-project Skill inventory containing only Skill names and optional linked My Skills IDs.
- Let linked entries reuse synchronized My Skills detail data.
- Keep unlinked local entries name-only; do not upload their content or file paths.

## Non-goals

- No remote editing, rescanning, importing, deleting, or distributing of local Project Skills.
- No upload of project Skill source content or absolute Skill file paths.
