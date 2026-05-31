# TODO: Actionable Improvements

## High Priority (Production Hardening)

### 1. Add Retry Configuration Per-Tool
**Problem:** Hardcoded 3 retries, 1s base delay in `execWithRetry`. Not configurable.
**Action:**
- Add `RetryConfig` interface with `maxRetries`, `baseDelay`, `maxDelay`
- Pass config through `ToolHandlerConfig`
- Allow per-tool override in tool definitions
- Default: `{ maxRetries: 3, baseDelay: 1000, maxDelay: 8000 }`

**Files:** `src/cli.ts`, `src/tool-handler.ts`

### 2. Implement Proper LRU Cache ✅
**Problem:** Naive "delete first key" eviction in `docs-catalog.ts`. Map iteration order not guaranteed in all engines.
**Status:** ✅ DONE — `src/lru-cache.ts` with doubly-linked list, 14 tests covering eviction order/recency tracking.
**Action:**
- Create `src/lru-cache.ts` with doubly-linked list implementation
- Track access order explicitly
- Replace `docCache` Map with LRU instance
- Add tests for eviction order

**Files:** `src/lru-cache.ts` (new), `src/docs-catalog.ts`, `test/helpers/lru-cache.test.ts` (new)

### 3. Add SIGKILL Fallback After SIGTERM Timeout
**Problem:** `child.kill('SIGTERM')` in `executor.ts` but no SIGKILL if process hangs.
**Action:**
- After SIGTERM, wait 5s
- If process still alive, send SIGKILL
- Log warning when SIGKILL needed
- Add test with mock hanging process

**Files:** `src/executor.ts`, `test/helpers/executor.test.ts` (new)

### 4. Version Compatibility Checks for Juno CLI
**Problem:** No validation that installed Juno CLI supports called flags/commands.
**Action:**
- Add `getCliVersion()` function that parses `juno --version`
- Define minimum supported version (e.g., `0.0.50`)
- Check version on first CLI call, cache result
- Throw clear error if version too old
- Add `--skip-version-check` flag for CI

**Files:** `src/cli.ts`, `src/constants.ts`, `test/helpers/cli.test.ts`

### 5. Parse Common CLI Errors for Better Messages
**Problem:** Generic `formatResponse` just shows exit code + stderr.
**Action:**
- Create `src/error-parser.ts` with pattern matching
- Detect: auth failures, network errors, config missing, satellite not found
- Return structured error with suggestion
- Example: "Authentication failed. Run `juno login` or set JUNO_TOKEN."

**Files:** `src/error-parser.ts` (new), `src/cli.ts`, `test/helpers/error-parser.test.ts` (new)

---

## Medium Priority (Feature Gaps)

### 6. Add Dry-Run Mode to Deploy/Clear
**Problem:** Only `hosting_prune` has `--dry-run`. Deploy/clear lack preview.
**Status:** ❌ BLOCKED — Juno CLI does not support `--dry-run` on `hosting deploy` or `hosting clear`. Closest equivalent for deploy is `--no-apply` (already exposed via `noApply`). No equivalent for clear. Task cannot be implemented at MCP layer without CLI support.
**Action (if CLI adds support later):**
- Add `dryRun?: boolean` to `hostingDeploySchema`, `hostingClearSchema`
- Pass `--dry-run` flag to CLI
- Update tool descriptions to mention preview capability
- Add tests for dry-run output parsing

**Files:** `src/schemas/hosting.ts`, `src/tools/hosting.ts`, `test/tools/hosting.test.ts`

### 7. Add Streaming Log Support
**Problem:** Progress updates but not full log streaming.
**Action:**
- Add `streamLogs?: boolean` param to long-running tools
- Stream stdout/stderr lines as MCP log notifications
- Use `notifications/message` with `level: "info"/"error"`
- Keep existing progress notifications separate

**Files:** `src/executor.ts`, `src/tool-handler.ts`, `src/tools/hosting.ts`, `src/tools/functions.ts`

### 8. Add Auth Status Validation Tool ✅
**Problem:** Can't verify `JUNO_TOKEN` valid before operations.
**Status:** ✅ DONE — `juno_auth_status` tool wraps `juno whoami`. `readOnlyHint: true`. Tests in `test/tools/handler-identity.test.ts`.
**Action:**
- Add `juno_auth_status` tool
- Call `juno whoami` or equivalent
- Return: authenticated user, token expiry, permissions
- Mark as `readOnlyHint: true`

**Files:** `src/tools/identity.ts`, `src/schemas/identity.ts`, `test/tools/identity.test.ts`

### 10. Add Test Coverage Reporting
**Problem:** 289 tests pass but coverage percentage unknown.
**Action:**
- Enable Vitest coverage with `v8` provider
- Add `npm run test:coverage` script
- Set minimum thresholds: 80% lines, 75% branches
- Add coverage badge to README
- Exclude `dist/` and `test/` from coverage

**Files:** `vitest.config.ts`, `package.json`, `README.md`

---

## Low Priority (Polish)

### 11. Make Timeouts/Limits Configurable
**Problem:** Hardcoded `CHARACTER_LIMIT = 50000`, `NETWORK_TIMEOUT = 300000`.
**Action:**
- Add environment variables: `JUNO_MCP_CHAR_LIMIT`, `JUNO_MCP_TIMEOUT`
- Parse in `src/constants.ts` with defaults
- Document in README under "Environment Variables"

**Files:** `src/constants.ts`, `README.md`

### 12. Batch Size Auto-Tuning Based on File Count
**Problem:** User sets `batch=200` for 5 files. Wasteful.
**Action:**
- In `buildHostingDeployArgs`, cap batch at file count
- Requires reading source directory before CLI call
- Log: "Adjusted batch size from 200 to 5 (file count)"
- Add `--no-auto-batch` flag to disable

**Files:** `src/tools/hosting.ts`, `test/tools/hosting.test.ts`

### 13. Progress Parsing Version Detection
**Problem:** Hardcoded phase names, regex patterns. Breaks if CLI output changes.
**Action:**
- Detect Juno CLI version (see #4)
- Load progress patterns from version-specific config
- Fallback to generic pattern if version unknown
- Add `src/progress-patterns.ts` with version map

**Files:** `src/progress-patterns.ts` (new), `src/executor.ts`

### 14. Docs Catalog Auto-Generation from Repo
**Problem:** 159 hardcoded topic mappings. Manual sync with Juno docs repo.
**Action:**
- Add `scripts/generate-docs-catalog.ts`
- Fetch Juno docs repo file tree via GitHub API
- Generate `src/schemas/docs.ts` TOPICS map automatically
- Run in CI on schedule, open PR if changes detected
- Add `npm run generate:docs` script

**Files:** `scripts/generate-docs-catalog.ts` (new), `package.json`, `.github/workflows/sync-docs.yml` (new)

---

## Bug Fixes

### 15. Fix Failing Test: handleVersion
**Problem:** Test expects `"version"` but code calls `"--version"`.
**Action:**
- Update test expectation in `test/tools/handler-identity.test.ts:22`
- Change `"version"` to `"--version"`
- Verify test passes

**Files:** `test/tools/handler-identity.test.ts`

### 16. Fix Stdin Automation Timing
**Problem:** Hardcoded 5s initial delay, 3s between answers. Fragile.
**Action:**
- Replace fixed delays with prompt detection
- Listen for specific prompt strings (e.g., "Enter satellite ID:")
- Send answer when prompt detected
- Add timeout fallback (10s) if prompt never appears
- Make delays configurable via `stdinConfig`

**Files:** `src/executor.ts`, `test/helpers/executor.test.ts`

---

## Technical Debt

### 17. Remove Type Assertions in registered-tool.ts
**Problem:** `as Parameters<McpServer["registerTool"]>[2]` indicates SDK type mismatch.
**Action:**
- Investigate MCP SDK type definitions
- Align `RegisteredToolHandler` signature with SDK expectations
- Remove type assertion
- Add comment if workaround needed

**Files:** `src/registered-tool.ts`

### 18. Add Logging for Silent Error Catches
**Problem:** Progress notification errors silently consumed in `cli.ts:136`.
**Action:**
- Add debug logging: `console.error('[DEBUG] Progress notification failed:', error)`
- Only log if `DEBUG=true` or `JUNO_MCP_DEBUG=true`
- Helps diagnose MCP client issues

**Files:** `src/cli.ts`

---

## Documentation

### 19. Add Architecture Decision Records (ADRs)
**Action:**
- Create `docs/adr/` directory
- Document key decisions:
  - ADR-001: Why wrap CLI instead of direct API calls
  - ADR-002: Execution strategy pattern (simple/retry/streaming)
  - ADR-003: Context capability system
  - ADR-004: Docs caching strategy
- Use template: Context, Decision, Consequences

**Files:** `docs/adr/*.md` (new)

### 20. Add Contributing Guide
**Action:**
- Create `CONTRIBUTING.md`
- Cover: setup, running tests, adding new tools, schema patterns
- Link to ADRs for architecture context
- Add PR checklist: tests, schemas, tool annotations

**Files:** `CONTRIBUTING.md` (new)

---

## Priority Order for Implementation

**Week 1:** #15 (fix test), #5 (error parsing), #4 (version check)
**Week 2:** #1 (retry config), #3 (SIGKILL fallback), #10 (coverage)
**Week 3:** #2 (LRU cache), #6 (dry-run), #9 (auth status)
**Week 4:** #7 (telemetry), #8 (log streaming), #11 (config env vars)

Low priority items: implement as needed or when user requests.
