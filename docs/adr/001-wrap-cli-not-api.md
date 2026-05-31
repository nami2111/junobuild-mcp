# ADR-001: Wrap the Juno CLI instead of the API

**Status:** Accepted
**Date:** 2026-05-31

## Context

Juno exposes two surfaces a third-party integration could target:

1. **`@junobuild/cli`** — the official command-line tool, distributed via npm, that ships with `juno login`, `juno hosting deploy`, `juno functions publish`, change workflow commands, snapshots, and an emulator. It handles authentication tokens, signing, IC canister calls, and progress output.
2. **The underlying Juno API / `@junobuild/admin` SDK** — direct IC canister calls. No interactive auth, no progress, no change workflow helpers.

This MCP server needs to expose Juno operations to AI coding agents (Claude Code, Codex, Cursor, etc.). Each call goes through stdio and lasts the duration of a single tool invocation. We have to choose which surface to wire up.

Constraints:
- Users already authenticate via `juno login` for normal day-to-day work. Re-implementing OAuth/identity flows in an MCP server would diverge from that mental model.
- The CLI is the upstream's contract surface — its commands, flags, and exit codes are documented and versioned in the public roadmap. The internal admin SDK is not.
- The CLI's change workflow (`changes list`, `changes apply`, `changes reject`) is non-trivial: it includes hash verification, snapshots, and apply ordering. Reimplementing that on top of raw canister calls would duplicate a large amount of logic and drift.
- The CLI emits structured-ish progress lines (`[1/N] Uploading…`) that map cleanly to MCP `notifications/progress` events.
- Some operations (deploy, publish, upgrade) are network-sensitive and benefit from retry on transient failures — but those failures are visible at the CLI process level (non-zero exit + `econnreset`/`ETIMEDOUT` stderr), so they can be detected without SDK-level instrumentation.

## Decision

The server spawns `juno` as a child process for every tool that touches Juno state. We do **not** import `@junobuild/admin` or call canisters directly.

Concretely:
- `src/cli.ts` resolves the `juno` binary path once (cached), then spawns it via `src/executor.ts` for each tool call.
- Authentication is delegated entirely to the CLI's existing token handling (`juno login`, `JUNO_TOKEN`).
- Tools are thin wrappers: each one builds an argv (`hosting deploy --mode production`), runs the CLI, parses exit code + stdout/stderr into an MCP `CallToolResult`.
- Stdout/stderr are line-buffered for progress parsing and optional log streaming (see [ADR-002](002-execution-strategies.md)).

## Consequences

**Positive**
- Zero reimplementation of auth, canister calls, hash verification, or change-workflow state machine. Upstream owns those.
- New CLI features are exposed by adding a thin tool definition — no SDK glue.
- Errors surface with the same wording the user would see from the CLI directly, which makes debugging predictable.
- The MCP server can be installed without any Juno-specific runtime dependency beyond `@junobuild/cli` being on PATH.

**Negative**
- Every tool call pays subprocess spawn overhead (~50–150 ms cold, less when binary path is cached). For bursty/interactive use this is fine; for a hypothetical high-throughput automation it would be a bottleneck.
- We are coupled to the CLI's stdout shape for progress parsing (batch counters like `[3/10]`) and log streaming. CLI output changes can break progress detection — see [ADR-002](002-execution-strategies.md) for the mitigation (graceful fallback to a generic "Building…" indicator).
- Tool calls cannot easily run inside a single Juno session — each invocation re-authenticates and re-resolves config. For the MCP use case this is acceptable.
- Users without `@junobuild/cli` installed must install it. The `juno_version` and `juno_docs` tools are the only ones that do not need it.

**Revisit if**
- Juno publishes a stable, low-overhead programmatic SDK that covers the change workflow and progress events natively.
- Spawn overhead becomes the dominant latency in user-visible tool calls.
