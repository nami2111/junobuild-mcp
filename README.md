# junobuild-mcp-server

> **Unofficial** MCP server for [Juno](https://juno.build). Not affiliated with or endorsed by the Juno team.

Manage satellites, hosting, serverless functions, snapshots and more through any MCP-compatible client. Includes a built-in documentation tool to access Juno's official guides and references.

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

The `juno_docs` tool fetches Juno's official documentation on demand, helping agents understand concepts before running commands:

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
