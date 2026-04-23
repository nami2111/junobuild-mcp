# TODO — Codebase Improvements

> Generated from deep analysis of junobuild-mcp-server v1.2.8

---

## 🔴 High Priority

### 1. Fix Stale Tests

Several tests reference tools and schema fields that were removed in v1.2.4–v1.2.5. These tests **will fail** when run.

**Affected files:**
- `test/identity.test.ts` — references `juno_whoami` and `juno_open` (removed in v1.2.5)
- `test/tools.test.ts` — references `juno_emulator_stop` (removed in v1.2.5)
- `test/mcp-server.test.ts` — passes `serverlessFunctions` and `githubAction` to `juno_create_project` (removed from schema in v1.2.4)

**Action:** Update or remove these test cases to match the current tool registry.

---

### 2. Deduplicate `makeProgressCallback`

The exact same function is duplicated in:
- `src/tools/hosting.ts` (lines 13–27)
- `src/tools/functions.ts` (lines 18–32)

```typescript
function makeProgressCallback(extra: unknown): ProgressCallback | undefined {
  const e = extra as {
    _meta?: Record<string, unknown>;
    sendNotification: (n: unknown) => Promise<void>;
  };
  const token = e._meta?.progressToken as string | number | undefined;
  if (!token) return undefined;

  return (progress: number, message: string) => {
    e.sendNotification({
      method: "notifications/progress",
      params: { progressToken: token, progress, total: 100, message }
    }).catch(() => {});
  };
}
```

**Action:** Extract to a shared utility in `src/cli.ts` or create `src/utils.ts`.

---

### 3. Eliminate Shell Injection Risk in `execCli`

`execCli` builds command strings via template literal:

```typescript
const cmd = `${cliPath} ${command}${flagStr} ${args.join(" ")}`.trim();
```

If `flags.profile` or any argument contains shell metacharacters, this is vulnerable to command injection. While Zod schemas provide some validation, using `spawn()` with an argument array is the robust fix.

**Action:** Refactor `execCli` to use `spawn()` with a properly constructed argument array instead of `exec()` with a string.

---

## 🟡 Medium Priority

### 4. Add Path Validation to `juno_config_init`

The `path` parameter in `juno_config_init` writes directly to disk without validation:

```typescript
const filename = params.path ?? `juno.config.${ext}`;
// ...
await writeFile(filename, content, "utf-8");
```

A value like `../../../etc/passwd` could write outside the project directory.

**Action:** Validate `path` using `path.resolve()` and ensure it is within the project root (or current working directory).

---

### 5. Add `globalFlagsBase` to Changes Schemas

The `changes_list`, `changes_apply`, and `changes_reject` schemas do not include `mode` or `profile` flags. However, the underlying Juno CLI commands likely support these global flags.

**Action:** Add `globalFlagsBase` to the changes schemas and pass flags through to `execCli` calls, consistent with other domains.

---

### 6. Add Unit Tests for `cli.ts` Utilities

The sophisticated logic in `cli.ts` has no unit test coverage:

- `execWithRetry()` — exponential backoff, transient error detection
- `execWithStreaming()` — progress parsing, notification emission
- `formatResponse()` — error/warning formatting, truncation
- `parseProgress()` — batch phase detection, percentage calculation
- `isTransientError()` — pattern matching across 13 error signatures

**Action:** Add unit tests in `test/cli.test.ts` or a new `test/cli-utilities.test.ts`.

---

### 7. Make `create_project` Fully Async

`src/tools/config.ts` line 239 uses blocking `execSync`:

```typescript
execSync(`${pm} add ${dep}`, { cwd: dir });
```

This blocks the Node.js event loop during project creation.

**Action:** Replace `execSync` with `execCommandNonInteractive` (or equivalent async spawn).

---

### 8. Fix Silent Error in Project Move Operation

The `mv` command in `create_project` silently ignores errors:

```typescript
const moveCmd = `mv ${sourceDir} ${dir}`;
await new Promise<void>((resolve) => {
  import("node:child_process").then(({ exec }) => {
    exec(moveCmd, () => resolve()); // Error ignored!
  });
});
```

**Action:** Check the error callback and reject the promise on failure.

---

## 🟢 Low Priority

### 9. Normalize `FunctionLanguageEnum` Aliases

The schema accepts aliases (`rust`/`rs`, `typescript`/`ts`, `javascript`/`mjs`). Consider coercing or validating to canonical forms to prevent inconsistent CLI arguments.

---

### 10. Consider Re-adding `juno_whoami`

`juno_whoami` was removed in v1.2.5 during scope reduction. It is useful for auth verification in MCP workflows — confirming which identity is active before running destructive operations.

---

### 11. Improve `buildFlags` String Construction

```typescript
return parts.length > 0 ? " " + parts.join(" ") : "";
```

This adds a leading space that is later concatenated into the command string. Using an array-based approach (join all parts at the end) is cleaner and less error-prone.

---

## Summary Checklist

- [x] Fix stale tests (`juno_whoami`, `juno_open`, `juno_emulator_stop`, old schema fields)
- [x] Deduplicate `makeProgressCallback` into shared utility
- [ ] Refactor `execCli` to use `spawn()` with argument arrays
- [ ] Add path traversal validation to `juno_config_init`
- [ ] Add `globalFlagsBase` to changes schemas
- [ ] Add unit tests for retry, streaming, progress parsing, and formatting
- [ ] Replace `execSync` in `create_project` with async equivalent
- [ ] Fix silent error handling in project move operation
- [ ] Normalize language enum aliases (optional)
- [ ] Evaluate re-adding `juno_whoami` tool (optional)
- [ ] Clean up `buildFlags` string construction (optional)
