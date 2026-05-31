# junobuild-mcp-server

> **Unofficial** MCP server for [Juno](https://juno.build). Not affiliated with or endorsed by the Juno team.

Manage satellites, hosting, serverless functions, changes and more through any MCP-compatible client. Includes a built-in documentation tool to access Juno's official guides and references.

## Features

- **18 tools** across 6 domains — CLI coverage for identity, config, hosting, functions, changes, and documentation
- **Progress streaming** — long-running operations (deploy, publish, upgrade) emit real-time progress updates via MCP `notifications/progress`
- **Log streaming** — `streamLogs: true` mirrors raw stdout/stderr lines as MCP `notifications/message` events, independent of progress
- **Automatic retry** — network-dependent operations can retry on transient failures with exponential backoff
- **CLI binary caching** — resolves `juno` binary path once, eliminating npx overhead on every call
- **CLI version check** — verifies installed `@junobuild/cli` meets the minimum supported version on first call
- **Structured error parsing** — common CLI failures (auth, network, missing config) surface as actionable messages
- **Config file writing** — `juno_config_init` can write config files directly to disk
- **Auth verification** — `juno_auth_status` wraps `juno whoami` for read-only identity checks
- **Docs caching** — documentation responses backed by an LRU cache (50 entries, 1 h TTL)
- **Tunable limits** — character limit, default timeout, and network timeout overridable via env vars

## Client Setup

Choose your AI coding agent below for specific setup instructions.

<details>
<summary>

### Claude Code

</summary>

**CLI (recommended):**

```bash
claude mcp add junobuild npx -y junobuild-mcp-server
```

**Config file:**

| Scope   | Location             |
| ------- | -------------------- |
| User    | `~/.claude/mcp.json` |
| Project | `.mcp.json`          |

```json
{
  "mcpServers": {
    "junobuild": {
      "command": "npx",
      "args": ["-y", "junobuild-mcp-server"]
    }
  }
}
```

</details>

<details>
<summary>

### Codex

</summary>

**CLI:**

```bash
codex mcp add junobuild -- npx -y junobuild-mcp-server
```

**Config file:**

| Scope   | Location               |
| ------- | ---------------------- |
| Global  | `~/.codex/config.toml` |
| Project | `.codex/config.toml`   |

```toml
[mcp_servers.junobuild]
command = "npx"
args = ["-y", "junobuild-mcp-server"]
```

</details>

<details>
<summary>

### OpenCode

</summary>

**Config file:**

| Scope     | Location                                  |
| --------- | ----------------------------------------- |
| User      | `~/.opencode/opencode.json` (Linux/macOS) |
| Workspace | `opencode.json` (project root)            |

```json
{
  "mcpServers": {
    "junobuild": {
      "command": "npx",
      "args": ["-y", "junobuild-mcp-server"]
    }
  }
}
```

</details>

<details>
<summary>

### Factory Droid

</summary>

**CLI:**

```bash
droid mcp add junobuild npx -y junobuild-mcp-server
```

**Config file:**

| Scope   | Location              |
| ------- | --------------------- |
| User    | `~/.factory/mcp.json` |
| Project | `.factory/mcp.json`   |

```json
{
  "mcpServers": {
    "junobuild": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "junobuild-mcp-server"]
    }
  }
}
```

</details>

<details>
<summary>

### Antigravity

</summary>

Uses a **Powers** system with custom configuration.

**Config file:**

| Scope     | Location                                 |
| --------- | ---------------------------------------- |
| Workspace | `.antigravity/powers/` or project config |

Add the MCP server configuration to your Power's `mcp.json`:

```json
{
  "mcpServers": {
    "junobuild": {
      "command": "npx",
      "args": ["-y", "junobuild-mcp-server"]
    }
  }
}
```

**Note:** See [Antigravity MCP documentation](https://antigravity.codes/blog/antigravity-mcp-tutorial) for full Power setup.

</details>

<details>
<summary>

### Cursor

</summary>

**Config file:**

| Scope   | Location             |
| ------- | -------------------- |
| User    | `~/.cursor/mcp.json` |
| Project | `.cursor/mcp.json`   |

```json
{
  "mcpServers": {
    "junobuild": {
      "command": "npx",
      "args": ["-y", "junobuild-mcp-server"]
    }
  }
}
```

</details>

<details>
<summary>

### Amp Code

</summary>

**CLI:**

```bash
amp mcp add junobuild -- npx -y junobuild-mcp-server
```

**Config file:**

| Scope     | Location                                    |
| --------- | ------------------------------------------- |
| User      | `~/.config/amp/settings.json` (macOS/Linux) |
| Workspace | `.amp/settings.json`                        |

```json
{
  "amp.mcpServers": {
    "junobuild": {
      "command": "npx",
      "args": ["-y", "junobuild-mcp-server"]
    }
  }
}
```

**Note:** Workspace MCP servers require approval via `amp mcp approve <server-name>`.

</details>

<details>
<summary>

### VSCode

</summary>

**Config file:**

| Scope     | Location                               |
| --------- | -------------------------------------- |
| User      | `~/.config/Code/User/mcp.json` (Linux) |
| Workspace | `.vscode/mcp.json`                     |

```json
{
  "servers": {
    "junobuild": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "junobuild-mcp-server"]
    }
  }
}
```

</details>

<details>
<summary>

### Windsurf

</summary>

**Config file:**

| Scope | Location                              |
| ----- | ------------------------------------- |
| User  | `~/.codeium/windsurf/mcp_config.json` |

```json
{
  "mcpServers": {
    "junobuild": {
      "command": "npx",
      "args": ["-y", "junobuild-mcp-server"]
    }
  }
}
```

</details>

<details>
<summary>

### Kiro

</summary>

**Config file:**

| Scope     | Location                    |
| --------- | --------------------------- |
| User      | `~/.kiro/settings/mcp.json` |
| Workspace | `.kiro/settings/mcp.json`   |

```json
{
  "mcpServers": {
    "junobuild": {
      "command": "npx",
      "args": ["-y", "junobuild-mcp-server"]
    }
  }
}
```

</details>

<details>
<summary>

### Kilo Code

</summary>

**Config file:**

| Scope   | Location                            |
| ------- | ----------------------------------- |
| User    | `~/.config/Kilo Code/User/mcp.json` |
| Project | `.vscode/mcp.json`                  |

```json
{
  "servers": {
    "junobuild": {
      "command": "npx",
      "args": ["-y", "junobuild-mcp-server"]
    }
  }
}
```

</details>

<details>
<summary>

### Cline

</summary>

**Config file:**

| Scope | Location                                  |
| ----- | ----------------------------------------- |
| User  | `cline_mcp_settings.json` (in config dir) |

```json
{
  "mcpServers": {
    "junobuild": {
      "command": "npx",
      "args": ["-y", "junobuild-mcp-server"]
    }
  }
}
```

</details>

---

## Authenticate the Juno CLI

The server wraps [`@junobuild/cli`](https://juno.build/docs/reference/cli), which must be installed and authenticated:

```bash
npm i -g @junobuild/cli
juno login
```

For non-interactive environments (CI, headless), set the `JUNO_TOKEN` environment variable instead of running `juno login`. Tools that touch Juno state additionally accept `mode` and `profile` parameters to select an environment and identity per call.

## Environment Variables

For non-interactive environments (CI, headless), authenticate using environment variables:

```bash
export JUNO_TOKEN="your-juno-token"
```

### Server Tuning

Override defaults to tune resource limits without rebuilding. Values must be positive integers; invalid values fall back to defaults.

| Variable                   | Default   | Description                                                          |
| -------------------------- | --------- | -------------------------------------------------------------------- |
| `JUNO_MCP_CHAR_LIMIT`      | `25000`   | Max characters returned in a single tool response (truncates beyond) |
| `JUNO_MCP_TIMEOUT`         | `120000`  | Default subprocess timeout in milliseconds                           |
| `JUNO_MCP_NETWORK_TIMEOUT` | `300000`  | Timeout for network-bound operations (deploy, publish, upgrade) in ms |
| `JUNO_MCP_DEBUG`           | `false`   | When `true`, logs internal errors to stderr (silent catches, notifications) |

**Note:** The `juno_create_project` tool does NOT use the interactive `create-juno` CLI. Instead it:

1. Scaffolds a Vite project (React, Next.js, Svelte, Angular, or Vue)
2. Creates a `juno.config.ts` file

This allows fully non-interactive project creation.

### Documentation Access

The `juno_docs` tool fetches documentation directly from the [GitHub repo](https://github.com/junobuild/docs/tree/main/docs), with responses cached for 1 hour:

```
juno_docs({ topic: "build_datastore" })        → Datastore guide
juno_docs({ topic: "build_authentication" })   → Authentication overview
juno_docs({ topic: "reference_cli" })        → CLI reference
juno_docs({ topic: "guides_local_development" }) → Local development guide
```

Topic keys use underscore naming matching folder hierarchy: `build_<feature>`, `reference_cli_<command>`, `guides_<framework>`. Full enumeration of all 159 topics lives in [`src/schemas/docs.ts`](./src/schemas/docs.ts) (`TOPICS` map).

## Tools

| Domain        | Tools                                                                                              |
| ------------- | -------------------------------------------------------------------------------------------------- |
| **Identity**  | `juno_version`, `juno_run`, `juno_status`, `juno_auth_status`                                      |
| **Config**    | `juno_config_init`, `juno_config_apply`, `juno_create_project`                                     |
| **Hosting**   | `juno_hosting_deploy`, `juno_hosting_clear`, `juno_hosting_prune`                                  |
| **Functions** | `juno_functions_build`, `juno_functions_eject`, `juno_functions_publish`, `juno_functions_upgrade` |
| **Changes**   | `juno_changes_list`, `juno_changes_apply`, `juno_changes_reject`                                   |
| **Docs**      | `juno_docs`                                                                                        |

## Key Parameters

Several tools support optional parameters for enhanced reliability and UX:

| Parameter   | Type      | Tools                    | Description                                                                                                 |
| ----------- | --------- | ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `retry`     | `boolean` | deploy, publish, upgrade | Automatically retry on transient network failures (up to 3 attempts with exponential backoff: 1s → 2s → 4s) |
| `progress`  | `boolean` | deploy, publish, upgrade | Stream real-time progress updates during long-running operations (build status + upload batch progress)     |
| `streamLogs`| `boolean` | deploy, publish, upgrade | Stream raw stdout/stderr lines as MCP `notifications/message` events. Independent from `progress`           |
| `writeFile` | `boolean` | `juno_config_init`       | Write the config file directly to disk instead of returning text for preview                                |

## Prerequisites

- **Node.js** >= 18
- **@junobuild/cli** `>= 0.15.0` — installed and authenticated (not needed for `juno_version` or `juno_docs`). Minimum version enforced on first call via `checkCliVersion` (`src/constants.ts` `MIN_CLI_VERSION`). Bypass with `JUNO_SKIP_VERSION_CHECK=true`.
- Juno project with `juno.config.ts/js/json` (for config/hosting operations)

## Development

```bash
npm run build           # Compile TypeScript to dist/
npm run dev             # Watch mode (development)
npm run start           # Run compiled dist/index.js
npm run clean           # Remove dist/
npm test                # Run unit tests
npm run test:coverage   # Run tests with coverage report (v8 provider)
```

### Coverage thresholds

The suite enforces the following minimum coverage (configured in `vitest.config.ts`):

- Lines: 80%
- Statements: 80%
- Functions: 80%
- Branches: 75%

Coverage reports are written to `coverage/` (html, lcov, json, plus text summary).

## Publishing

```bash
npm run changeset    # Create a changeset (version bump + changelog entry)
npm run version      # Apply changesets → bump version
npm run release      # Publish to npm
```

## Architecture

Key design decisions are documented as [ADRs in `docs/adr/`](./docs/adr/README.md):

- [ADR-001 — Wrap the Juno CLI instead of the API](./docs/adr/001-wrap-cli-not-api.md)
- [ADR-002 — Execution strategy pattern (simple / retry / streaming)](./docs/adr/002-execution-strategies.md)
- [ADR-003 — Context capability system](./docs/adr/003-context-capabilities.md)
- [ADR-004 — Docs caching strategy](./docs/adr/004-docs-caching.md)

## License

MIT
