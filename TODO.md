# Improvement Plan

## 1. Remove unnecessary dynamic imports in `juno_create_project`

**File**: `src/tools/config.ts`  
**Lines**: 206, 238

### Problem

Two `await import(...)` calls add complexity without benefit:

- **Line 206**: `const { execCommandNonInteractive } = await import("../cli.js")` — `execCommandNonInteractive` is already a named export from `cli.ts` and could be added to the static import on line 4. No need for a dynamic import.
- **Line 238**: `const { readFile, writeFile } = await import("node:fs/promises")` — `mkdir`, `writeFile`, and `rename` are already statically imported on line 1. Only `readFile` is missing.

### Fix

1. Add `execCommandNonInteractive` to the `cli.ts` static import on line 4:
   ```typescript
   import { execCli, execCommandNonInteractive, formatResponse } from "../cli.js";
   ```
2. Add `readFile` to the `node:fs/promises` static import on line 1:
   ```typescript
   import { mkdir, writeFile, rename, readFile } from "node:fs/promises";
   ```
3. Remove the dynamic `await import("../cli.js")` block on line 206.
4. Remove the dynamic `await import("node:fs/promises")` block on line 238.
5. Use `execCommandNonInteractive` directly (already in scope after fix #1).
6. Use `readFile` and `writeFile` directly (already in scope after fix #2).

---

## 2. Surface `@junobuild/core` install failure in `juno_create_project`

**File**: `src/tools/config.ts`  
**Lines**: 246–249

### Problem

When `pm add @junobuild/core` fails (e.g., registry down, network error, package not found), the error is completely swallowed:

```typescript
if (addResult.exitCode !== 0) {
  // Skip if package not found - static sites don't need SDK
}
```

No diagnostic reaches the user. They will believe everything worked when in fact the dependency is missing.

### Fix

Capture the install result and append a warning to the output text:

```typescript
const deps = ["@junobuild/core"];
const failedDeps: string[] = [];
for (const dep of deps) {
  const addResult = await execCommandNonInteractive(`${pm} add ${dep}`, 120_000, dir);
  if (addResult.exitCode !== 0) {
    failedDeps.push(dep);
  }
}

// ... build output ...

if (failedDeps.length > 0) {
  output += `\n**Warning:** Failed to install: ${failedDeps.join(", ")}. You may need to run \`${pm} install\` manually.\n`;
}
```

This informs the user that dependencies are missing while still allowing the project creation to succeed (since static sites indeed don't require the SDK).

---

## 3. Audit and unify timeout constants

**Files**: `src/constants.ts`, `src/tools/functions.ts`, `src/tools/changes.ts`

### Problem

Timeout assignment is inconsistent across network-bound tools:

| Tool | Timeout Used | Value |
|---|---|---|
| `juno_hosting_deploy` | `DEPLOY_TIMEOUT` | 300s |
| `juno_hosting_clear` | `DEPLOY_TIMEOUT` | 300s |
| `juno_hosting_prune` | `DEPLOY_TIMEOUT` | 300s |
| `juno_functions_build` | `DEPLOY_TIMEOUT` | 300s |
| `juno_functions_publish` | `DEPLOY_TIMEOUT` | 300s |
| `juno_functions_upgrade` | `DEPLOY_TIMEOUT` | 300s |
| `juno_config_apply` | `DEPLOY_TIMEOUT` | 300s |
| `juno_changes_apply` | `DEPLOY_TIMEOUT` | 300s |
| `juno_changes_reject` | `DEPLOY_TIMEOUT` | 300s |
| **`juno_functions_eject`** | **`DEFAULT_TIMEOUT`** | **120s** |
| **`juno_changes_list`** | **`DEFAULT_TIMEOUT`** | **120s** |
| `juno_version` | `DEFAULT_TIMEOUT` | 120s |
| `juno_run` | `DEFAULT_TIMEOUT` | 120s |
| `juno_status` | `DEFAULT_TIMEOUT` | 120s |

`juno_functions_eject` and `juno_changes_list` both make network calls (eject may fetch scaffold templates from a remote source; changes list queries the satellite) but use the shorter `DEFAULT_TIMEOUT` (120s) instead of `DEPLOY_TIMEOUT` (300s).

The naming is also misleading — `DEPLOY_TIMEOUT` is used for config apply, changes apply/reject, and functions build, none of which are "deploy" operations.

### Fix

1. **Rename constants** in `src/constants.ts`:
   - `DEFAULT_TIMEOUT` stays for lightweight local-only or fast tools
   - `DEPLOY_TIMEOUT` → `NETWORK_TIMEOUT` (semantically accurate for all network-bound CLI calls)

2. **Apply the renamed constant** to the two under-provisioned tools:
   - `juno_functions_eject` (line 62): pass `NETWORK_TIMEOUT` as 4th arg to `execCli`
   - `juno_changes_list` (line 27): pass `NETWORK_TIMEOUT` as 4th arg to `execCli`

3. **Update all existing usage sites** to use the new constant name (`DEPLOY_TIMEOUT` → `NETWORK_TIMEOUT` across `src/tools/config.ts`, `src/tools/hosting.ts`, `src/tools/functions.ts`, `src/tools/changes.ts`).
