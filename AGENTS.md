# AGENTS.md

## Project Overview

MCP server for Juno (junobuild) — wraps `@junobuild/cli` commands via `child_process` to expose 28 tools for managing satellites, hosting, functions, snapshots, and more.

## Build & Run Commands

```bash
npm run build          # Compile TypeScript to dist/
npm run dev            # Watch mode with tsx (development)
npm run start          # Run compiled dist/index.js
npm run clean          # Remove dist/

# Quick verification
npm run build && node dist/index.js   # Must start without errors
```

There is **no linter, formatter, or test framework** configured yet. When adding one, prefer:
- **Linting**: ESLint with `@typescript-eslint`
- **Formatting**: Prettier (already familiar to Juno ecosystem)
- **Testing**: Vitest (already used in the Juno monorepo)

## Project Structure

```
src/
├── index.ts              # Entry point — McpServer init + tool registration
├── cli.ts                # Shared execCli() utility wrapping @junobuild/cli
├── types.ts              # CliResult, GlobalFlags, ToolResponse interfaces
├── constants.ts          # Timeouts, enums (ModuleTarget, Mode)
├── schemas/              # Zod schemas — one file per domain
│   ├── common.ts         # GlobalFlagsSchema spread into all schemas
│   ├── hosting.ts
│   └── ...
└── tools/                # Tool registrations — one file per domain
    ├── hosting.ts
    └── ...
```

## Code Style

### TypeScript
- **Strict mode** enabled — no `any`, use `unknown` or proper types
- **ESM modules** — `"type": "module"` in package.json
- **`.js` extensions** on all imports: `import { x } from "./cli.js"`
- **Explicit return types** on exported functions
- **`import type`** for type-only imports

### Naming Conventions
- **Tool names**: `juno_{action}_{resource}` snake_case (e.g. `juno_hosting_deploy`)
- **Schema names**: `{domain}{Action}Schema` camelCase (e.g. `hostingDeploySchema`)
- **Registration functions**: `register{Domain}Tools(server)` (e.g. `registerHostingTools`)
- **File names**: lowercase, matching domain (e.g. `hosting.ts`)

### Tool Registration Pattern
```typescript
server.registerTool(
  "juno_{action}_{resource}",
  {
    title: "Display Name",
    description: "What it does. Args: - param (type): desc",
    inputSchema: schema.shape,
    annotations: { readOnlyHint, destructiveHint, idempotentHint, openWorldHint }
  },
  async (params) => {
    const flags: GlobalFlags = { mode: params.mode, profile: params.profile };
    const args: string[] = [];
    // ... build args from params
    const result = await execCli("command", args, flags);
    return { content: [{ type: "text", text: formatResponse(result, "Label") }] };
  }
);
```

### Schema Pattern
- Use `.strict()` on all Zod objects
- Spread `GlobalFlagsSchema` for tools that target environments
- Every field needs `.describe()` for MCP tool discovery

### Imports Order
1. Node builtins (`node:child_process`)
2. External packages (`@modelcontextprotocol/sdk/...`, `zod`)
3. Internal: `../cli.js`, `../constants.js`, `../types.js`
4. Schemas from `../schemas/`

### Error Handling
- `execCli()` never throws — always returns `CliResult` with `exitCode`
- `formatResponse()` truncates output at 25000 chars to prevent token overflow
- Return `{ isError: true }` in tool responses only for unrecoverable failures

## Adding a New Tool

1. Add Zod schema in `src/schemas/{domain}.ts` — spread `GlobalFlagsSchema` if applicable
2. Add tool registration in `src/tools/{domain}.ts` — follow the pattern above
3. If new domain: register in `src/index.ts` and create both files
4. Always run `npm run build` before committing
