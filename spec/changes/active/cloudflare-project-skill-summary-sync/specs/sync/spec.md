# Sync Delta

## FR-001: Project Skill summaries synchronize to Web

- Project registration names, roots, scan paths, and deploy targets MUST synchronize through `settings.skillProjects`.
- Each synchronized project MAY include a name-only Skill inventory.
- An inventory item MAY reference a synchronized My Skills ID when stable path or fingerprint identity proves the relationship.
- Unlinked items MUST NOT include instructions, content, or local file paths.
- Cloudflare Web MUST display linked items using My Skills data and unlinked items as name-only summaries.
