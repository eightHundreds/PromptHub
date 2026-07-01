# CLI DB Path Delta Spec

## Modified Requirements

### Requirement: CLI MUST use the desktop canonical SQLite path

When the CLI is configured with a PromptHub user data root, it MUST open the same canonical SQLite database path as the desktop app.

#### Scenario: Unified DB exists

- Given `<userData>/data/prompthub.db` exists
- And `<userData>/prompthub.db` may also exist
- When a user runs a CLI command that reads skills
- Then the CLI reads `<userData>/data/prompthub.db`
- And it MUST NOT read stale data from `<userData>/prompthub.db`

#### Scenario: Legacy root DB exists

- Given `<userData>/data/prompthub.db` does not exist
- And `<userData>/prompthub.db` exists
- When a user runs a CLI command that reads skills
- Then the CLI reads `<userData>/prompthub.db` for backward compatibility

#### Scenario: New CLI workspace

- Given neither DB file exists
- When a CLI command initializes the database
- Then the CLI creates `<userData>/data/prompthub.db`
