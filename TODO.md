# TODO — Issues & Improvements

> **Status:** Items marked ✅ have been implemented. Remaining items are still open.

## Critical

### 1. ✅ Silent failures — `execCli()` never rejects, tools never check `exitCode`

**Status:** IMPLEMENTED

**What was done:**
- `formatResponse()` now returns `{ text: string; isError: boolean }` instead of just `string`
- All 28 tool handlers updated to destructure and propagate `isError` to the MCP client
- Error output now prominently shows `**Error (exit code N)**` at the top
- Stderr is labeled as `**Warnings:**` on success, shown as error content on failure

---

### 2. ✅ `juno_create_project` bypasses shared `execCli()` utility

**Status:** IMPLEMENTED

**What was done:**
- Extracted `execCommand()` helper in `src/cli.ts` that handles exec, ANSI stripping, buffer config
- `execCli()` now delegates to `execCommand()` internally
- `juno_create_project` updated to use `execCommand()` instead of raw `child_process.exec`

---

### 3. ✅ `juno_docs` fetches raw HTML instead of markdown

**Status:** VERIFIED OK — No changes needed

**Finding:** The `.md` URLs (e.g. `https://juno.build/docs/build/datastore.md`) return raw markdown content directly. The current implementation is correct.

---

## High Priority

### 4. No streaming/progress feedback for long-running operations

**Problem:** Deploy, publish, and upgrade operations can take several minutes. The MCP SDK supports progress tokens (`_meta.progressToken`) but none of the tools use them. The LLM client gets zero feedback until the operation completes or times out.

**Fix:**
- Accept the `progressToken` from the MCP request `_meta` field.
- For operations that support it, parse CLI output for progress indicators (percentage, file counts, etc.) and emit `server.sendProgress()` calls.
- At minimum, emit periodic heartbeat progress messages (e.g. "Deploy in progress...") every N seconds for operations exceeding a threshold.

**Files affected:** `src/cli.ts`, `src/tools/hosting.ts`, `src/tools/functions.ts`, `src/tools/snapshot.ts`, `src/tools/modules.ts`

---

### 5. ✅ `npx @junobuild/cli` on every invocation adds 2-5s overhead

**Status:** IMPLEMENTED

**What was done:**
- Added `resolveCliPath()` function that tries `which juno` first, falls back to `npx @junobuild/cli`
- Result is cached in a module-level variable (`cachedCliPath`) after first resolution
- Subsequent calls use the cached path, eliminating npx overhead

---

### 6. ✅ `watch` mode flags will hang MCP calls indefinitely

**Status:** IMPLEMENTED

**What was done:**
- Removed `watch` parameter from `functionsBuildSchema` and `emulatorStartSchema`
- Removed `if (params.watch) args.push("-w")` from both tool handlers
- Watch mode is a developer workflow, not appropriate for MCP context

---

### 7. ✅ Interactive CLI flags will hang in non-interactive MCP context

**Status:** IMPLEMENTED

**What was done:**
- Removed `cdn: boolean` from `functionsUpgradeSchema` (the interactive flag)
- Kept `cdnPath: string` (the non-interactive alternative for specifying a CDN path directly)
- Removed `if (params.cdn) args.push("--cdn")` from the upgrade handler

**Fix:**
- Remove the `cdn` boolean flag entirely.
- Replace with a new read-only tool `juno_functions_list_cdn` that returns available WASM versions, then use the existing `cdnPath` string parameter to select one.
- Audit all other tools for similar interactive flags.

**Files affected:** `src/schemas/functions.ts`, `src/tools/functions.ts`

---

## Medium Priority

### 8. No retry logic for network-dependent operations

**Problem:** Deploy, publish, upgrade, and snapshot operations depend on network connectivity to the Internet Computer. Transient failures (network blips, rate limits, IC congestion) cause permanent failures with no retry.

**Fix:**
- Add a configurable retry wrapper around `execCli()` for operations tagged as "network-dependent".
- Use exponential backoff (e.g. 1s, 2s, 4s) with a max of 3 retries.
- Only retry on specific failure patterns (network errors, timeouts), not on validation errors or authentication failures.
- Expose a `retry` parameter on the relevant tool schemas.

**Files affected:** `src/cli.ts`, relevant tool files

---

### 9. ✅ `formatResponse()` surfaces stderr as errors even for non-error output

**Status:** IMPLEMENTED

**What was done:**
- On success (`exitCode === 0`): stderr is labeled as `**Warnings:**` so the LLM knows these are non-fatal
- On failure (`exitCode !== 0`): stderr is shown as the primary error content
- Known harmless patterns are not filtered yet (future improvement)

---

### 10. ✅ Enum/schema duplication across files

**Status:** IMPLEMENTED

**What was done:**
- Created `src/schemas/enums.ts` with shared Zod enums:
  - `FunctionLanguageEnum` — used by functions.ts, emulator.ts
  - `ModuleTargetEnum` — used by snapshot.ts, modules.ts
  - `PackageManagerEnum` — used by config.ts
  - `ConfigFormatEnum` — used by config.ts
  - `BrowserEnum` — used by identity.ts
- Removed unused `FunctionLanguage`, `ModuleTarget`, and `Mode` const enums from `constants.ts`

---

### 11. No helpful input validation error messages

**Problem:** When Zod validation fails, the error propagates to the MCP framework as a generic schema validation error. The LLM client receives an unhelpful message that doesn't explain which field failed or why.

**Fix:**
- Wrap tool handlers with a validation step that catches `ZodError` and formats a human-readable message listing each failed field and the reason.
- Example: `"Invalid input: 'batch' must be between 1 and 200 (got 500), 'target' is required but was not provided."`
- Consider a shared `validateInput(schema, params)` helper that all tools use.

**Files affected:** `src/cli.ts` or new `src/validation.ts`, all tool files

---

### 12. `juno_config_init` requires LLM to write files manually

**Problem:** The tool returns config text with instructions like "Save this as `juno.config.ts` in your project root." This relies on the LLM correctly writing the file content, which introduces risk of formatting errors, wrong filenames, or missed steps.

**Fix:**
- Add a `writeFile: boolean` parameter (default `false`) that, when true, writes the config file directly using `node:fs`.
- Or: create a separate `juno_config_write` tool that takes the generated config content and a target path.
- Add a `dryRun: boolean` parameter to preview without writing.
- Validate the generated config by running `juno config apply --force` after writing (optional).

**Files affected:** `src/schemas/config.ts`, `src/tools/config.ts`

---

## Low Priority

### 13. ✅ Server version hardcoded instead of read from package.json

**Status:** IMPLEMENTED

**What was done:**
- `src/index.ts` now reads version from `package.json` at runtime using `readFileSync` and `fileURLToPath`
- No more manual version updates needed on releases

---

### 14. No composite/atomic operations

**Problem:** Common workflows require multiple tool calls that should be atomic:
- Deploy + prune + config apply (currently 3 separate calls)
- Snapshot + upgrade (currently 2 separate calls, though upgrade has `--no-snapshot`)
- Emulator start + wait (currently 2 separate calls)

**Fix:**
- Add composite tools that bundle common workflows:
  - `juno_hosting_deploy_full` — deploy with prune and optional config apply
  - `juno_module_upgrade_safe` — snapshot then upgrade
  - `juno_emulator_start_ready` — start then wait
- Or: enhance existing tools with additional boolean flags that trigger follow-up actions.

**Files affected:** New or existing tool files

---

### 15. No caching for `juno_docs` tool

**Problem:** Every call to `juno_docs` fetches from `https://juno.build` over the network. Documentation content changes infrequently, so this is wasteful and adds latency.

**Fix:**
- Implement a simple in-memory cache with TTL (e.g. 1 hour).
- Use a `Map<string, { content: string, expiresAt: number }>` keyed by topic.
- On cache hit, return immediately. On miss or expiry, fetch and store.
- Add a `forceRefresh: boolean` parameter to bypass cache.
- Consider cache size limits to prevent memory growth.

**Files affected:** `src/tools/docs.ts`

---

## Summary by Priority

| Priority | Total | Implemented | Remaining |
|----------|-------|-------------|-----------|
| Critical | 3 | 3 ✅ | 0 |
| High | 4 | 3 ✅ | 1 (#4 Progress feedback) |
| Medium | 5 | 3 ✅ | 2 (#8 Retry, #11 Validation, #12 Config writing) |
| Low | 3 | 1 ✅ | 2 (#14 Composite ops, #15 Docs caching) |

**9 of 15 items implemented.** 6 remain as future improvements.

## Changelog

### Implemented
- **#1** — All 28 tools now properly propagate `isError` based on CLI exit code
- **#2** — `juno_create_project` uses shared `execCommand()` helper
- **#3** — Verified docs tool works correctly (raw markdown URLs)
- **#5** — CLI binary path resolved once and cached (`which juno` → fallback to `npx`)
- **#6** — Removed `watch` mode from functions and emulator schemas
- **#7** — Removed interactive `cdn` flag from functions upgrade schema
- **#9** — Stderr labeled as `**Warnings:**` on success, error content on failure
- **#10** — Created `src/schemas/enums.ts` with 5 shared Zod enums, removed duplicates
- **#13** — Server version read from `package.json` at runtime

### Remaining
- **#4** — Progress feedback for long-running operations
- **#8** — Retry logic for network-dependent operations
- **#11** — Helpful input validation error messages
- **#12** — `juno_config_init` file writing support
- **#14** — Composite/atomic operations
- **#15** — Docs caching with TTL
