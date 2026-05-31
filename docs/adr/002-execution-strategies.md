# ADR-002: Execution strategy pattern

**Status:** Accepted
**Date:** 2026-05-31

## Context

Following [ADR-001](001-wrap-cli-not-api.md), every tool ends up spawning `juno`. But not every tool has the same runtime profile:

- **Reads** (`juno status`, `juno whoami`, `juno --version`, `juno changes list`) finish in well under a second, return quickly, and have no useful intermediate output.
- **Network-bound mutations** (`juno hosting deploy`, `juno functions publish`, `juno functions upgrade`) take seconds to minutes, emit batched progress (`[2/10] Uploading…`), and can fail transiently on flaky networks (ECONNRESET, ETIMEDOUT, 502/503/504).
- **Local builds** (`juno functions build`) emit a lot of compiler output but are deterministic and rarely benefit from retry.

A naive approach — one `execCli` path for everything — forces every tool to pay for streaming infrastructure or retry bookkeeping. A per-tool approach — every handler writes its own spawn loop — duplicates logic and makes flag-passing inconsistent.

Additionally, two MCP-specific capabilities only make sense for some tools:
- `notifications/progress` updates so the MCP client can show a progress bar.
- `notifications/message` log streaming so the client can mirror stdout/stderr live (added in TODO #7).

Both are opt-in per tool, controlled by request params (`progress`, `streamLogs`).

## Decision

Centralize tool execution behind a single `makeToolHandler(config)` factory (`src/tool-handler.ts`) that dispatches to one of three execution strategies:

| Strategy    | When                                                          | Implementation                              |
| ----------- | ------------------------------------------------------------- | ------------------------------------------- |
| `simple`    | Default — fast reads, idempotent local commands               | `execCli` — single spawn, no retry          |
| `retry`     | Network-bound mutations marked `retry: true`                   | `execWithRetry` — up to 3 attempts, exponential backoff (1s → 2s → 4s), only on `isTransientError` exit codes |
| `streaming` | When the request asks for progress or log streaming           | `execWithStreaming` — line-buffered stdout/stderr, optional `onProgress` + `onLog` callbacks |

Strategy selection is per-call:
- `config.strategy` sets a default for the tool.
- `config.getStrategy(params)` lets each tool promote to `streaming` when `params.progress || params.streamLogs` (this is what `hosting_deploy`, `functions_publish`, `functions_upgrade` do).

All three strategies share the same `CliResult` shape (`{ stdout, stderr, exitCode }`) and the same `formatResponse(result, label)` post-processing. Each tool is unaware of which strategy ran.

Transient error detection (`isTransientError`) is a single regex match against stderr — it is intentionally permissive (matches `timeout`, `ECONNRESET`, `429`, `5xx`, etc.) because false retries are cheap and false negatives strand the user.

## Consequences

**Positive**
- Tool definitions stay declarative: a tool author picks a strategy by setting one field, no spawn/retry/streaming code in tool files.
- Streaming is opt-in by request, not by tool — same tool can run silently for a script and emit progress for an interactive user.
- Retries only kick in for the specific class of errors that actually benefit (transient network), avoiding wasted retries on auth failures or config errors.
- Adding a fourth strategy (e.g., "queue + poll") would be a new branch in one switch, not changes across 20 tools.

**Negative**
- Adds one layer of indirection between the tool definition and the spawn. New contributors have to read `tool-handler.ts` and `cli.ts` to understand what happens at runtime.
- Strategies share state through params (`params.progress`, `params.streamLogs`), which means the tool-handler has to know about MCP-specific request fields. This is a deliberate tradeoff — those fields are the strategy switch.
- Streaming progress parsing depends on CLI output format (batch counters). If the upstream CLI changes its output, progress reporting degrades silently to a generic "Building…" pulse. See [ADR-001](001-wrap-cli-not-api.md) for the coupling tradeoff.

**Revisit if**
- A class of tools emerges that doesn't fit any of the three strategies (e.g., long-lived streaming sessions that survive across MCP calls). Add a new strategy rather than special-casing inside existing ones.
