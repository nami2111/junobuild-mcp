# TODO — Docs Tool Redesign: Fetch from GitHub Repo

> **Status:** ✅ IMPLEMENTED — Fetching from GitHub with 159 topics

---

## Summary

Redesign `juno_docs` tool to:

1. **Fetch from GitHub** instead of `juno.build` website
2. **Match folder hierarchy exactly** for topic naming (underscore separator)
3. **Include ALL 140+ topics** from the complete docs repo
4. **No backward compatibility** — new topic keys only

---

## Current State

### Source Comparison

| Aspect          | Current                        | New                                                          |
| --------------- | ------------------------------ | ------------------------------------------------------------ |
| Base URL        | `https://juno.build`           | `https://raw.githubusercontent.com/junobuild/docs/main/docs` |
| Topic count     | 17 topics                      | 140+ topics                                                  |
| Topic keys      | Flat naming (`authentication`) | Hierarchical (`build_authentication`)                        |
| File extensions | `.md` only                     | `.md` and `.mdx`                                             |

### Current TOPICS in `src/schemas/docs.ts`

```typescript
export const TOPICS = {
  intro: "/docs/intro.md",
  "start-a-new-project": "/docs/start-a-new-project.md",
  "setup-the-sdk": "/docs/setup-the-sdk.md",
  "create-a-satellite": "/docs/create-a-satellite.md",
  authentication: "/docs/build/authentication.md",
  datastore: "/docs/build/datastore.md",
  storage: "/docs/build/storage.md",
  hosting: "/docs/build/hosting.md",
  functions: "/docs/build/functions.md",
  analytics: "/docs/build/analytics.md",
  cli: "/docs/reference/cli.md",
  configuration: "/docs/reference/configuration.md",
  plugins: "/docs/reference/plugins.md",
  settings: "/docs/reference/settings.md",
  emulator: "/docs/reference/emulator.md",
  terminology: "/docs/terminology.md",
  pricing: "/docs/pricing.md"
} as const;
```

---

## New Implementation Plan

### 1. Update Base URL

**File:** `src/tools/docs.ts`

```typescript
// Before
const BASE_URL = "https://juno.build";

// After
const BASE_URL = "https://raw.githubusercontent.com/junobuild/docs/main/docs";
```

### 2. Handle File Extensions

The GitHub repo uses both `.md` and `.mdx` extensions. The fetch logic needs to:

1. Try the path as-is first (some files are `.md`)
2. If 404, try swapping extension (`.mdx` → `.md` or vice versa)

**Implementation:**

```typescript
async function fetchDoc(path: string): Promise<string> {
  // Try original path
  let url = `${BASE_URL}${path}`;
  let response = await fetch(url);

  // If 404, try alternate extension
  if (!response.ok) {
    const alternate = path.endsWith(".mdx")
      ? path.replace(/\.mdx$/, ".md")
      : path.replace(/\.md$/, ".mdx");
    url = `${BASE_URL}${alternate}`;
    response = await fetch(url);
  }

  return response.text();
}
```

### 3. New TOPICS Mapping (140+ topics)

**File:** `src/schemas/docs.ts`

Complete mapping matching GitHub folder structure exactly:

| Topic Key                                    | GitHub Path                                       |
| -------------------------------------------- | ------------------------------------------------- |
| **ROOT (8)**                                 |                                                   |
| intro                                        | /intro.mdx                                        |
| start_a_new_project                          | /start-a-new-project.mdx                          |
| setup_the_sdk                                | /setup-the-sdk.mdx                                |
| create_a_satellite                           | /create-a-satellite.mdx                           |
| terminology                                  | /terminology.mdx                                  |
| pricing                                      | /pricing.md                                       |
| faq                                          | /faq.md                                           |
| troubleshooting                              | /troubleshooting.md                               |
| **BUILD - Authentication (8)**               |                                                   |
| build_authentication                         | /build/authentication/index.md                    |
| build_authentication_google                  | /build/authentication/google.mdx                  |
| build_authentication_github                  | /build/authentication/github.mdx                  |
| build_authentication_internet_identity       | /build/authentication/internet-identity.md        |
| build_authentication_passkeys                | /build/authentication/passkeys.md                 |
| build_authentication_management              | /build/authentication/management.md               |
| build_authentication_utilities               | /build/authentication/utilities.md                |
| build_authentication_dev                     | /build/authentication/dev.md                      |
| **BUILD - Datastore (3)**                    |                                                   |
| build_datastore                              | /build/datastore/index.mdx                        |
| build_datastore_collections                  | /build/datastore/collections.md                   |
| build_datastore_development                  | /build/datastore/development.mdx                  |
| **BUILD - Storage (3)**                      |                                                   |
| build_storage                                | /build/storage/index.mdx                          |
| build_storage_collections                    | /build/storage/collections.md                     |
| build_storage_development                    | /build/storage/development.mdx                    |
| **BUILD - Hosting (3)**                      |                                                   |
| build_hosting                                | /build/hosting/index.md                           |
| build_hosting_configuration                  | /build/hosting/configuration.mdx                  |
| build_hosting_development                    | /build/hosting/development.md                     |
| **BUILD - Functions (6)**                    |                                                   |
| build_functions                              | /build/functions/index.md                         |
| build_functions_development                  | /build/functions/development/index.mdx            |
| build_functions_development_rust             | /build/functions/development/rust.mdx             |
| build_functions_development_typescript       | /build/functions/development/typescript.mdx       |
| build_functions_lifecycle                    | /build/functions/lifecycle.md                     |
| build_functions_logs                         | /build/functions/logs.md                          |
| **BUILD - Analytics (3)**                    |                                                   |
| build_analytics                              | /build/analytics/index.md                         |
| build_analytics_setup                        | /build/analytics/setup.mdx                        |
| build_analytics_development                  | /build/analytics/development.md                   |
| **BUILD - Components (16)**                  |                                                   |
| build_components_analytics                   | /build/components/analytics.mdx                   |
| build_components_apply_configuration         | /build/components/apply_configuration.mdx         |
| build_components_assertions                  | /build/components/assertions.mdx                  |
| build_components_certified_reads             | /build/components/certified-reads.md              |
| build_components_client_side                 | /build/components/client-side.mdx                 |
| build_components_datastore_storage           | /build/components/datastore-storage.md            |
| build_components_encoding                    | /build/components/encoding.mdx                    |
| build_components_http_headers                | /build/components/http-headers.mdx                |
| build_components_iframe                      | /build/components/iframe.mdx                      |
| build_components_ignore_files                | /build/components/ignore-files.mdx                |
| build_components_nodejs_usage                | /build/components/nodejs-usage.md                 |
| build_components_precompress                 | /build/components/precompress.mdx                 |
| build_components_redirects                   | /build/components/redirects.mdx                   |
| build_components_rewrites                    | /build/components/rewrites.mdx                    |
| build_components_source                      | /build/components/source.mdx                      |
| build_components_source_examples             | /build/components/source-examples.mdx             |
| **REFERENCE - CLI (38)**                     |                                                   |
| reference_cli                                | /reference/cli.mdx                                |
| reference_cli_changes                        | /reference/cli/changes.md                         |
| reference_cli_changes_apply                  | /reference/cli/changes-apply.md                   |
| reference_cli_changes_list                   | /reference/cli/changes-list.md                    |
| reference_cli_changes_reject                 | /reference/cli/changes-reject.md                  |
| reference_cli_config                         | /reference/cli/config.md                          |
| reference_cli_config_apply                   | /reference/cli/config-apply.md                    |
| reference_cli_config_init                    | /reference/cli/config-init.md                     |
| reference_cli_emulator                       | /reference/cli/emulator.md                        |
| reference_cli_emulator_start                 | /reference/cli/emulator-start.md                  |
| reference_cli_emulator_wait                  | /reference/cli/emulator-wait.md                   |
| reference_cli_functions                      | /reference/cli/functions.md                       |
| reference_cli_functions_build                | /reference/cli/functions-build.md                 |
| reference_cli_functions_changes              | /reference/cli/functions-changes.md               |
| reference_cli_functions_eject                | /reference/cli/functions-eject.md                 |
| reference_cli_functions_publish              | /reference/cli/functions-publish.md               |
| reference_cli_functions_upgrade              | /reference/cli/functions-upgrade.md               |
| reference_cli_hosting                        | /reference/cli/hosting.md                         |
| reference_cli_hosting_clear                  | /reference/cli/hosting-clear.md                   |
| reference_cli_hosting_deploy                 | /reference/cli/hosting-deploy.md                  |
| reference_cli_hosting_prune                  | /reference/cli/hosting-prune.md                   |
| reference_cli_login                          | /reference/cli/login.md                           |
| reference_cli_logout                         | /reference/cli/logout.md                          |
| reference_cli_open                           | /reference/cli/open.md                            |
| reference_cli_run                            | /reference/cli/run.md                             |
| reference_cli_snapshot                       | /reference/cli/snapshot.md                        |
| reference_cli_snapshot_upload                | /reference/cli/snapshot-upload.md                 |
| reference_cli_start                          | /reference/cli/start.md                           |
| reference_cli_status                         | /reference/cli/status.md                          |
| reference_cli_stop                           | /reference/cli/stop.md                            |
| reference_cli_upgrade                        | /reference/cli/upgrade.md                         |
| reference_cli_version                        | /reference/cli/version.md                         |
| reference_cli_whoami                         | /reference/cli/whoami.md                          |
| **REFERENCE - Emulator (3)**                 |                                                   |
| reference_emulator                           | /reference/emulator/infrastructure.md             |
| reference_emulator_satellite                 | /reference emulator/satellite.md                  |
| reference_emulator_skylab                    | /reference emulator/skylab.md                     |
| **REFERENCE - Functions (14)**               |                                                   |
| reference_functions                          | /reference/functions/components/ic-cdk.md         |
| reference_functions_sdk                      | /reference/functions/components/sdk.mdx           |
| reference_functions_utils                    | /reference/functions/components/utils.md          |
| reference_functions_rust                     | /reference/functions/rust/ic-cdk.mdx              |
| reference_functions_rust_sdk                 | /reference/functions/rust/sdk.mdx                 |
| reference_functions_rust_utils               | /reference/functions/rust/utils.mdx               |
| reference_functions_rust_crate_versions      | /reference/functions/rust/crate-versions.md       |
| reference_functions_typescript               | /reference/functions/typescript/ic-cdk.mdx        |
| reference_functions_typescript_sdk           | /reference/functions/typescript/sdk.mdx           |
| reference_functions_typescript_utils         | /reference/functions/typescript/utils.mdx         |
| reference_functions_typescript_canisters     | /reference/functions/typescript/canisters.mdx     |
| reference_functions_typescript_schema        | /reference/functions/typescript/schema.md         |
| reference_functions_typescript_node          | /reference/functions/typescript/node.md           |
| **REFERENCE - Other (3)**                    |                                                   |
| reference_configuration                      | /reference/configuration.mdx                      |
| reference_settings                           | /reference/settings.md                            |
| reference_plugins                            | /reference/plugins.mdx                            |
| **GUIDES (37)**                              |                                                   |
| guides_local_development                     | /guides/local-development.mdx                     |
| guides_manual_deployment                     | /guides/manual-deployment.mdx                     |
| guides_e2e                                   | /guides/e2e.md                                    |
| guides_ai                                    | /guides/ai.md                                     |
| guides_typescript                            | /guides/typescript.mdx                            |
| guides_nodejs                                | /guides/nodejs.mdx                                |
| guides_rust                                  | /guides/rust.mdx                                  |
| guides_github_actions                        | /guides/github-actions/index.mdx                  |
| guides_github_actions_deploy_frontend        | /guides/github-actions/deploy-frontend.mdx        |
| guides_github_actions_publish_functions      | /guides/github-actions/publish-functions.mdx      |
| guides_github_actions_upgrade_functions      | /guides/github-actions/upgrade-functions.mdx      |
| guides_react                                 | /guides/react/build.mdx                           |
| guides_react_deploy                          | /guides/react/deploy.mdx                          |
| guides_nextjs                                | /guides/nextjs/build.mdx                          |
| guides_nextjs_deploy                         | /guides/nextjs/deploy.mdx                         |
| guides_angular                               | /guides/angular/build.mdx                         |
| guides_angular_deploy                        | /guides/angular/deploy.mdx                        |
| guides_astro                                 | /guides/astro/build.mdx                           |
| guides_astro_deploy                          | /guides/astro/deploy.mdx                          |
| guides_sveltekit                             | /guides/sveltekit/build.mdx                       |
| guides_sveltekit_deploy                      | /guides/sveltekit/deploy.mdx                      |
| guides_vue                                   | /guides/vue/build.mdx                             |
| guides_vue_deploy                            | /guides/vue/deploy.mdx                            |
| guides_docusaurus                            | /guides/docusaurus/deploy.mdx                     |
| **MANAGEMENT (2)**                           |                                                   |
| management_monitoring                        | /management/monitoring.md                         |
| management_snapshots                         | /management/snapshots.md                          |
| **MISCELLANEOUS (8)**                        |                                                   |
| miscellaneous_access_keys                    | /miscellaneous/access-keys.md                     |
| miscellaneous_architecture                   | /miscellaneous/architecture.md                    |
| miscellaneous_best_practices                 | /miscellaneous/best-practices.md                  |
| miscellaneous_infrastructure                 | /miscellaneous/infrastructure.md                  |
| miscellaneous_memory                         | /miscellaneous/memory.md                          |
| miscellaneous_wallet                         | /miscellaneous/wallet.mdx                         |
| miscellaneous_workarounds                    | /miscellaneous/workarounds.md                     |
| miscellaneous_provisioning_options           | /miscellaneous/provisioning-options.mdx           |
| **COMPARISON (5)**                           |                                                   |
| comparison_vs_heroku                         | /comparison/vs-heroku.md                          |
| comparison_vs_netlify                        | /comparison/vs-netlify.md                         |
| comparison_vs_railway                        | /comparison/vs-railway.md                         |
| comparison_vs_self_hosting                   | /comparison/vs-self-hosting.md                    |
| comparison_vs_vercel                         | /comparison/vs-vercel.md                          |
| **COMPONENTS (Infrastructure) (4)**          |                                                   |
| components_core                              | /components/core.mdx                              |
| components_bash                              | /components/bash.mdx                              |
| components_cycles                            | /components/cycles.md                             |
| components_subnets                           | /components/subnets.md                            |
| **EXAMPLES (26)**                            |                                                   |
| examples_frontend_react_typescript           | /examples/frontend/react-typescript.mdx           |
| examples_frontend_react_javascript           | /examples/frontend/react-javascript.mdx           |
| examples_frontend_nextjs                     | /examples/frontend/nextjs.mdx                     |
| examples_frontend_angular                    | /examples/frontend/angular.mdx                    |
| examples_frontend_sveltekit                  | /examples/frontend/sveltekit.mdx                  |
| examples_frontend_vue                        | /examples/frontend/vue.mdx                        |
| examples_frontend_vanilla_javascript         | /examples/frontend/vanilla-javascript.mdx         |
| examples_functions_rust                      | /examples/functions/rust/assertion.mdx            |
| examples_functions_rust_canister_calls       | /examples/functions/rust/canister-calls.mdx       |
| examples_functions_rust_generating_assets    | /examples/functions/rust/generating-assets.mdx    |
| examples_functions_rust_mutating_docs        | /examples/functions/rust/mutating-docs.mdx        |
| examples_functions_typescript                | /examples/functions/typescript/assertion.mdx      |
| examples_functions_typescript_canister_calls | /examples/functions/typescript/canister-calls.mdx |
| examples_functions_typescript_mutating_docs  | /examples/functions/typescript/mutating-docs.mdx  |

---

## Implementation Tasks

### Task 1: Update `src/schemas/docs.ts`

- [ ] Replace TOPICS object with full 140+ topic mapping
- [ ] Update TopicKey type to include all new keys
- [ ] Use proper Zod enum pattern

### Task 2: Update `src/tools/docs.ts`

- [ ] Change BASE_URL to GitHub raw content URL
- [ ] Add extension fallback logic (try .mdx → .md)
- [ ] Preserve caching logic
- [ ] Update description text

### Task 3: Build & Verify

- [ ] Run `npm run build`
- [ ] Test with `node dist/index.js`
- [ ] Verify a few topics fetch correctly
- [ ] Test extension fallback works

---

## Files Affected

| File                  | Change                               |
| --------------------- | ------------------------------------ |
| `src/schemas/docs.ts` | Replace TOPICS (17 → 140+ topics)    |
| `src/tools/docs.ts`   | Update BASE_URL, add extension logic |

---

## Verification Commands

```bash
# Build
npm run build

# Start server (test mode)
node dist/index.js

# Test topics via MCP client
# juno_docs topic="build_authentication"
# juno_docs topic="reference_cli_functions_build"
# juno_docs topic="guides_local_development"
```

---

## Notes

1. **No backward compatibility** — old topic keys like `authentication` are NOT mapped
2. **Topic keys match GitHub exactly** — underscores replaced for dashes in filenames
3. **Extension handling** — some topics use `.mdx`, some use `.md`, tool tries both
4. **Caching preserved** — 1-hour TTL cache continues to work

---

## Changelog

### Before

- Base URL: `https://juno.build`
- Topics: 17 (flat naming)
- Source: Juno website

### After

- Base URL: `https://raw.githubusercontent.com/junobuild/docs/main/docs`
- Topics: 159 (hierarchical naming)
- Source: GitHub repository (markdown/mdx source files)

---

## Implementation Complete

**Files modified:**

- `src/schemas/docs.ts` — 159 topics with full GitHub path mapping
- `src/tools/docs.ts` — Updated BASE_URL, extension fallback logic

**Verification:**

- Build: ✅ `npm run build` passes
- Topic count: ✅ 159 topics
- Server starts: ✅ No errors
- Fetch test: ✅ Working (tested build_authentication, guides_local_development)
