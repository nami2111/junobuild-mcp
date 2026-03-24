# junobuild-mcp-server

> **Unofficial** MCP server for [Juno](https://juno.build). Not affiliated with or endorsed by the Juno team.

Manage satellites, hosting, serverless functions, snapshots and more through any MCP-compatible client.

## Install

```bash
npm install -g junobuild-mcp-server
```

## Usage

Add to your MCP client configuration (e.g. Claude Desktop, Cursor):

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

The server requires [`@junobuild/cli`](https://juno.build/docs/reference/cli) to be installed and authenticated:

```bash
npm i -g @junobuild/cli
juno login
```

For non-interactive environments (CI, headless), set the `JUNO_TOKEN` environment variable or use the `--mode` and `--profile` flags available on every tool.

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

## Prerequisites

- **Node.js** >= 18
- **@junobuild/cli** — installed and authenticated
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
