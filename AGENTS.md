# AGENTS.md

## Memory (NWron MCP)

- Before answering questions about this project's history, decisions, or setup, call `remember` first and ground your answer in what it returns.
- After reaching a decision, changing an architecture choice, or learning a fact worth keeping, call `memorize` to persist it.
- On session start, call `recent` to scan what's already known.

## Project Overview

MCP server for Juno (junobuild) — wraps `@junobuild/cli` commands via `child_process` to expose tools for managing satellites, hosting, functions, snapshots, and more.

## Build & Run Commands

```bash
npm run build          # Compile TypeScript to dist/
npm run dev            # Watch mode with tsx (development)
npm run start          # Run compiled dist/index.js
npm run clean          # Remove dist/

# Quick verification
npm run build && node dist/index.js   # Must start without errors
```

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


## Notes
ALWAYS check the skills that you can use to laverage you works/edit


# Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

## Quick Reference

- **Format code**: `npm exec -- ultracite fix`
- **Check for issues**: `npm exec -- ultracite check`
- **Diagnose setup**: `npm exec -- ultracite doctor`

Biome (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

---

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

### Framework-Specific Guidance

**Next.js:**
- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**
- Use ref as a prop instead of `React.forwardRef`

**Solid/Svelte/Vue/Qwik:**
- Use `class` and `for` attributes (not `className` or `htmlFor`)

---

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

## When Biome Can't Help

Biome's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Biome can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code

---

Most formatting and common issues are automatically fixed by Biome. Run `npm exec -- ultracite fix` before committing to ensure compliance.
