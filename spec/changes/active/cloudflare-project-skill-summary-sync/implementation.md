# Implementation

## Status

Implemented.

## Shipped

- Desktop self-hosted push now includes `settings.skillProjects` and privacy-safe `projectSkillInventories`.
- Inventory linking uses directory fingerprints or normalized local/symlink target paths, never names alone.
- Worker snapshot normalization preserves the optional inventory.
- Web startup hydrates Project Skill summaries before the shared renderer loads.
- Linked summaries open My Skills; unlinked summaries remain name-only and hide local paths/actions.

## Verification

- Failing-first tests confirmed project settings, Worker persistence, and Web hydration were absent.
- Focused desktop self-hosted sync tests: 9 passed.
- Focused Web workspace tests: 5 passed.
- Focused Worker sync tests: 4 passed.
- Web and Worker typechecks passed.
- Desktop typecheck passed.
- Web and Worker lint passed.
- Web production build passed.
- Worker full suite passed: 11 tests.
- Web full suite completed with 296 tests passing and 2 test files failing during module collection because `JWT_SECRET` was absent; this is an existing environment-harness requirement unrelated to the changed client path. The focused Web regression suite passed.
- `git diff --check` passed.
