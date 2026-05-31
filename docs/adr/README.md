# Architecture Decision Records

This directory captures the load-bearing design decisions behind `junobuild-mcp-server`. Each ADR follows the same three-section template: **Context**, **Decision**, **Consequences**.

ADRs are immutable once accepted — if a decision is later reversed or refined, add a new ADR that supersedes the old one rather than editing it in place.

## Index

| ID  | Title                                                | Status   |
| --- | ---------------------------------------------------- | -------- |
| 001 | [Wrap the Juno CLI instead of the API](001-wrap-cli-not-api.md) | Accepted |
| 002 | [Execution strategy pattern](002-execution-strategies.md)       | Accepted |
| 003 | [Context capability system](003-context-capabilities.md)        | Accepted |
| 004 | [Docs caching strategy](004-docs-caching.md)                    | Accepted |

## Template

```markdown
# ADR-NNN: <Short title>

**Status:** Proposed | Accepted | Superseded by ADR-XXX
**Date:** YYYY-MM-DD

## Context
What forces are at play? What constraints or prior decisions led here?

## Decision
What was chosen, stated as the actual change.

## Consequences
What becomes easier, harder, or different as a result. Both positive and negative.
```
