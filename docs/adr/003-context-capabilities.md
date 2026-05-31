# ADR-003: Context capability system

**Status:** Accepted
**Date:** 2026-05-31

## Context

Most Juno CLI commands accept a shared set of "environment" flags:

| Flag             | Meaning                                            |
| ---------------- | -------------------------------------------------- |
| `--mode`         | `production`, `staging`, `development`             |
| `--profile`      | Named identity for multi-identity setups           |
| `--container-url`| Override container endpoint (local emulator, etc.) |
| `--console-url`  | Override developer Console endpoint                |

But the *exact subset* a command honours varies:

- `juno --version` and `juno docs` honour none.
- `juno run -s script.ts` honours `--mode` and `--profile`, but not URLs.
- `juno hosting deploy` honours all four.
- `juno changes list` honours all four but also has its own filtering flags that have nothing to do with environment.

When wrapping these in MCP tools we had several options:

1. **Repeat the flags inline** in every tool definition — high duplication, easy to forget one.
2. **Always pass all four** — risks the CLI rejecting an unrecognised flag on commands that don't accept it, and pollutes the tool's JSON schema with irrelevant fields.
3. **Encode the supported subset declaratively** so the tool-handler builds the right argv automatically.

We chose option 3.

## Decision

Introduce a small "context capability" vocabulary in `src/juno-context.ts`:

```ts
export const JunoContextCapabilities = {
  mode: "mode",
  profile: "profile",
  containerUrl: "containerUrl",
  consoleUrl: "consoleUrl",
} as const;
```

Three preset bundles cover the common cases:

| Preset                | Capabilities                                            | Used by                              |
| --------------------- | ------------------------------------------------------- | ------------------------------------ |
| `modeProfileContext`  | `mode`, `profile`                                       | `juno_run` and similar                |
| `containerContext`    | `mode`, `profile`, `containerUrl`                       | tools that hit the container directly |
| `environmentContext`  | `mode`, `profile`, `containerUrl`, `consoleUrl`         | full environment-aware tools (hosting, functions, changes, identity) |

Each tool declares its capability bundle in its `ToolHandlerConfig.context`. The shared `makeToolHandler` then:

1. Picks only the supported keys from incoming params via `pickJunoContext(params, capabilities)`.
2. Builds the CLI argv via `buildJunoContextArgs(context, capabilities)`.
3. Passes the resulting argv to the chosen execution strategy (see [ADR-002](002-execution-strategies.md)).

Two opt-outs are explicitly supported:
- `context: false` — pass no environment flags (used by `juno --version`, `juno_docs`).
- `hasMode: false` — legacy switch for tools that pre-date the capability system.

Each tool's Zod schema mirrors the capability set: a tool that doesn't support `--container-url` does not expose `containerUrl` as a parameter. This keeps the MCP tool description honest about what the tool actually accepts.

## Consequences

**Positive**
- One source of truth for environment-flag plumbing — changing how `--mode` is passed only touches `juno-context.ts`.
- Tool schemas don't accept fields they would silently ignore. The MCP client (and the LLM driving it) sees only the params the tool actually honours.
- Adding a new capability (say, `--keyfile`) is two lines: add to the `JunoContextCapabilities` map, extend `buildJunoContextArgs`, then any tool that opts in via its preset gets it automatically.
- Tests can assert capability behaviour in one place rather than re-testing it per tool.

**Negative**
- The indirection costs a little discoverability — to know what flags `juno_hosting_deploy` passes you need to read both the tool file (which references `environmentContext`) and `juno-context.ts` (which defines it).
- The capability list is a hand-maintained mapping to the CLI's actual flag support. Drift from the upstream CLI is possible — if a flag is added to a command, we have to remember to extend the preset.
- "Capability" overloads a generic word. In MCP terminology, "capability" sometimes refers to MCP server/client feature negotiation. Inside this codebase the word always means "CLI environment-flag subset"; this is documented at the top of `juno-context.ts`.

**Revisit if**
- The CLI introduces a new class of flags that isn't well modelled as "environment" (e.g., command-level filtering that some tools share). At that point a more general "flag set" abstraction may make sense.
