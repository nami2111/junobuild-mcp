# junobuild-mcp-server

> **Unofficial** MCP server for [Juno](https://juno.build). Not affiliated with or endorsed by the Juno team.

Manage satellites, hosting, serverless functions, snapshots and more through any MCP-compatible client. Includes a built-in documentation tool to access Juno's official guides and references.

## Features

- **28 tools** across 9 domains — full CLI coverage for satellites, hosting, functions, snapshots, modules, changes, and more
- **Progress streaming** — long-running operations (deploy, publish, upgrade) emit real-time progress updates via MCP progress notifications
- **Automatic retry** — network-dependent operations can retry on transient failures with exponential backoff
- **CLI binary caching** — resolves `juno` binary path once, eliminating npx overhead on every call
- **Smart error handling** — all tools propagate `isError` based on CLI exit codes, with clean error messages
- **Config file writing** — `juno_config_init` can write config files directly to disk
- **Docs caching** — documentation responses cached for 1 hour to reduce latency

## Setup

### 1. Add to your MCP client

No install needed — `npx` handles downloading automatically.

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

### 2. Authenticate the Juno CLI

The server wraps [`@junobuild/cli`](https://juno.build/docs/reference/cli), which must be installed and authenticated:

```bash
npm i -g @junobuild/cli
juno login
```

For non-interactive environments (CI, headless), set the `JUNO_TOKEN` environment variable or use the `--mode` and `--profile` flags available on every tool.

### Documentation Access

The `juno_docs` tool fetches Juno's official documentation on demand, with responses cached for 1 hour:

```
juno_docs({ topic: "datastore" })  → Full markdown from juno.build/docs/build/datastore
juno_docs({ topic: "hosting" })    → Deployment guide
juno_docs({ topic: "cli" })        → CLI reference
```

Available topics: `intro`, `start-a-new-project`, `setup-the-sdk`, `create-a-satellite`, `authentication`, `datastore`, `storage`, `hosting`, `functions`, `analytics`, `cli`, `configuration`, `plugins`, `settings`, `emulator`, `terminology`, `pricing`.

## Tools

| Domain | Tools |
|--------|-------|
| **Identity** | `juno_whoami`, `juno_version`, `juno_open`, `juno_run` |
| **Config** | `juno_config_init`, `juno_config_apply`, `juno_create_project` |
| **Hosting** | `juno_hosting_deploy`, `juno_hosting_clear`, `juno_hosting_prune` |
| **Emulator** | `juno_emulator_start`, `juno_emulator_stop`, `juno_emulator_clear`, `juno_emulator_wait` |
| **Functions** | `juno_functions_build`, `juno_functions_eject`, `juno_functions_publish`, `juno_functions_upgrade` |
| **Snapshots** | `juno_snapshot_create`, `juno_snapshot_delete`, `juno_snapshot_list`, `juno_snapshot_download`, `juno_snapshot_upload`, `juno_snapshot_restore` |
| **Modules** | `juno_module_start`, `juno_module_stop`, `juno_module_upgrade`, `juno_module_status` |
| **Changes** | `juno_changes_list`, `juno_changes_apply`, `juno_changes_reject` |
| **Docs** | `juno_docs` |

## Key Parameters

Several tools support optional parameters for enhanced reliability and UX:

| Parameter | Type | Tools | Description |
|-----------|------|-------|-------------|
| `retry` | `boolean` | deploy, publish, upgrade, snapshot upload | Automatically retry on transient network failures (up to 3 attempts with exponential backoff: 1s → 2s → 4s) |
| `progress` | `boolean` | deploy, publish, upgrade, snapshot upload | Stream real-time progress updates during long-running operations (build status + upload batch progress) |
| `writeFile` | `boolean` | `juno_config_init` | Write the config file directly to disk instead of returning text for preview |
| `wait` | `boolean` | `juno_emulator_start` | Wait until the emulator is fully ready before returning |

## Prerequisites

- **Node.js** >= 18
- **@junobuild/cli** — installed and authenticated (not needed for `juno_version` or `juno_docs`)
- Juno project with `juno.config.ts/js/json` (for config/hosting operations)

## Development

```bash
npm run build        # Compile TypeScript to dist/
npm run dev          # Watch mode (development)
npm run start        # Run compiled dist/index.js
npm run clean        # Remove dist/
```

## Publishing

```bash
npm run changeset    # Create a changeset (version bump + changelog entry)
npm run version      # Apply changesets → bump version
npm run release      # Publish to npm
```

## License

MIT
