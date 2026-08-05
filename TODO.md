# TODO: MCP 2026-07-28 Spec Upgrade Plan

Analyzed: [spec 2026-07-28 changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog) vs current server (`@modelcontextprotocol/sdk@1.27.1`, v1, stdio-only).

## Spec delta that matters here

| Spec change | Impact on this server |
|---|---|
| Stateless protocol: `initialize` handshake removed; every request carries version + capabilities + identity in `_meta`; `server/discover` added (MUST implement) | Need SDK v2 wire. Server has zero session state (all state in tool params) → migration is free |
| `notifications/message` gated by per-request `_meta.logLevel` (absent = MUST NOT emit); Logging feature deprecated | Current `streamLogs` emits unconditionally → protocol violation on 2026 wire |
| `resultType: "complete"` / `"input_required"` on all results; MRTR pattern replaces server→client requests (roots/sampling/elicitation); `requestState` for multi-step flows | Candidate to replace fragile stdin automation; SDK shims MRTR to 2025-era clients |
| CacheableResult: `ttlMs` + `cacheScope` required on list results; tools/list should be deterministic order | Tools list is static → cheap wins: stable order + cache hints |
| Streamable HTTP is the headline transport; reqs: `Mcp-Method`/`Mcp-Name` headers, stateless serving | Server is stdio-only. Biggest capability gap |
| SDK v2 = package split: `@modelcontextprotocol/server`, `@modelcontextprotocol/client`, `@modelcontextprotocol/core`, `@modelcontextprotocol/node`; Node 20+; zod ^4.2 (have 4.3.6 ✅) | Renames + import path changes across src/ and test/ |
| OTel `_meta` trace context (`traceparent`/`tracestate`/`baggage`) | Optional: forward to juno CLI child env |
| Not relevant: `subscriptions/listen` (no resources/prompts, static toolset), tasks extension, error-code renumbering (SDK-level), `x-mcp-header` (HTTP-mode, SDK-level), OAuth auth opt-ins (only if HTTP-mode), SSE transport deprecation (unused) | — |

---

## P0 — Migration to SDK v2 + 2026-07-28 wire

### 1. Split-package migration ✅
**Why:** v1 SDK never puts a 2026-07-28 byte on the wire. Everything else depends on this.

**Status:** ✅ DONE — @modelcontextprotocol/sdk@1.27.1 → @modelcontextprotocol/server@2.0.0 (+ @modelcontextprotocol/client@2.0.0 in devDeps, test-only) + @modelcontextprotocol/core@2.0.0 transitively. Codemod `v1-to-v2` ran clean; grep `@mcp-codemod-error` = 0. zod ^4.4.3 installed (SDK's deprecated raw-shape overload is broken on zod ^4.4 — `ZodRawShape` is now `$ZodShape`, SDK's own `Record<string, z.ZodType>` is stale — so registerJunoTools wraps `z.object(shape)` → modern overload). Pre-existing lint failures fixed (2 regex hoists, makeToolHandler complexity → extracted `execByStrategy`). engines.node ≥20. Build clean, 345 tests pass, wire smoke test OK (initialize + tools/list via stdio, v2 SDK serializes 2020-12 JSON Schema).

**Do:**
- `package.json`: drop `@modelcontextprotocol/sdk`, add `@modelcontextprotocol/server@^2.0.0` (+ `@modelcontextprotocol/core` if we import raw `*Schema` constants — currently we only import types; add only what imports demand)
- Run `npx @modelcontextprotocol/codemod@latest v1-to-v2 .` at repo root; then `grep -rn '@mcp-codemod-error' .` and fix markers by hand
- Run `npm exec -- ultracite fix` after codemod (it rewrites AST without reformatting)
- Update test files: mocked v1 imports (`@modelcontextprotocol/sdk/server/mcp.js` etc.) → v2 packages; `test/test-utils.ts` mock server rewire

**Files:** `package.json`, `package-lock.json`, `src/**`, `test/**`

### 2. Swap stdio entry for `serveStdio` factory ✅
**Why:** a hand-constructed `Server`/`McpServer` + `StdioServerTransport` serves only 2025-era. `serveStdio(() => buildServer())` negotiates era per connection.

**Status:** ✅ DONE — src/index.ts exports `buildServer(): McpServer` (all 7 tool groups registered) and calls `serveStdio(buildServer, { onerror })`. Dual-era default `legacy: 'serve'` kept (comment marks `{ legacy: 'reject' }` for later). Verified both eras with real v2 client: (a) legacy — e2e listTools via default Client connect passes; (b) modern — `versionNegotiation: { mode: 'pin', pin: '2026-07-28' }` → `getProtocolEra() === 'modern'`, `getServerVersion()` reads stamped `_meta['io.modelcontextprotocol/serverInfo']`, 18 tools listed. Raw-wire probe: 2025 `initialize` still answers correctly on claim-less connections.
- `src/index.ts`: replace `server.connect(new StdioServerTransport())` with `serveStdio(() => buildServer())` from `@modelcontextprotocol/server/stdio`
- Refactor index.js to export `buildServer()` (register all tools, return `McpServer`) — same factory reused for HTTP mode (P1-1)
- Keep dual-era default (`legacy: 'stateless'`) so existing 2025-era clients (Claude Desktop etc.) keep working; `{ legacy: 'reject' }` only later
- Server identity: SDK stamps `_meta['io.modelcontextprotocol/serverInfo']` on every 2026 response from `McpServer` options — name/version already set, nothing to do; verify with MCP Inspector
- `engines.node`: `>=18` → `>=20`; update README prerequisites

**Files:** `src/index.ts`, `package.json`, `README.md`

### 3. Handler callback signature (v1 `(params, extra)` → v2 `(args, ctx)`)
**Why:** codemod renames `RequestHandlerExtra`→`ServerContext`, `extra`→`ctx`; v1-typed helpers won't compile after.

**Do:**
- `src/tool-handler.ts`: `makeToolHandler` returns a v2 handler; `(params, extra)` → `(args, ctx)`; drop now-unused `extra` plumbing
- `src/registered-tool.ts`: `RegisteredToolHandler`/`ToolCallback` reimport from v2; `ZodRawShapeCompat` import from `@modelcontextprotocol/sdk/server/zod-compat.js` is dropped by codemod → retype `inputSchema` per v2 `registerTool` signature (codemod wraps raw shapes with `z.object()`)
- No `extra.sessionId` state anywhere (verified) → stateless migration is free; double-check with `grep -rn 'sessionId\|extra\.' src/`

**Files:** `src/tool-handler.ts`, `src/registered-tool.ts`, `src/tools/*.ts`, `src/cli.ts`

---

## P0 — Protocol compliance: log + progress notifications

### 4. Gate `notifications/message` on per-request `logLevel` ✅
**Why:** spec: servers MUST NOT emit `notifications/message` for requests whose `_meta` lacked `io.modelcontextprotocol/logLevel`. Current `streamLogs` emits unconditionally → violates 2026 wire.

**Status:** ✅ DONE — `makeLogCallback(extra, logger)` → `makeLogCallback(ctx: ServerContext, logger?)` calling `ctx.mcpReq.log(level, data, logger)` (SDK gates: per-request `_meta.logLevel` on 2026-era, absent = silently opt-out; session `logging/setLevel` on legacy). Old `sendNotification`-plumbing and manual `notifications/message` payloads deleted. BONUS: progress ported here too (P0-4/5 share the same code path) — `makeProgressCallback(ctx)` reads `ctx.mcpReq._meta?.progressToken` (still a plain `_meta` key in v2, not envoy) and sends via `ctx.mcpReq.notify({method: "notifications/progress", ...})` (request-scoped send). tool-handler now `(params, ctx: ServerContext)`.
Tests: cli.test.ts blocks rewritten against mocked ctx (`mcpReq.log`/`mcpReq.notify`/`_meta`), handler-hosting/functions mocks + call sites updated (1 obsolete test removed: “returns undefined when no sendNotification”). 344 tests pass, build clean, ultracite green. Live client verification pending juno CLI (see P0-5).
- Replace `makeLogCallback(extra, logger)` in `src/cli.ts` with v2 gated path: `ctx.mcpReq.log()` (auto gates on envelope `logLevel`; absent = silently opt-out) — or read `ctx.mcpReq.envelope['io.modelcontextprotocol/logLevel']` manually and skip when absent
- `streamLogs` param keeps working on 2025-era clients (session-scoped `logging/setLevel` still honored by SDK legacy path)

**Files:** `src/cli.ts`, `src/tool-handler.ts`, `test/helpers/cli.test.ts`

### 5. Fix progress notifications wiring (verify against real client) 🚧
**Why:** current `makeProgressCallback` read `extra._meta.progressToken` + `extra.sendNotification` — dead at runtime under real clients. Under 2026, progress is request-scoped on the response stream.

**Status:** 🚧 WIRING DONE, LIVE VERIFICATION PENDING — ported in P0-4 (see above): `makeProgressCallback(ctx)` reads `ctx.mcpReq._meta?.progressToken`, sends via `ctx.mcpReq.notify` (request-scoped). Remaining: run a streaming tool (deploy/functions publish) with `progress: true` / `streamLogs: true` against a real client (v2 `Client` — modern `_meta.logLevel` via `client.setLoggingLevel()`, progressToken via request meta) and confirm notifications on the wire. Requires juno CLI + a satellite (JUNO_E2E suite).
- Port `makeProgressCallback` to v2 notify mechanism; read `progressToken` from `ctx.mcpReq.envelope._meta`
- Integration-check with MCP Inspector (stdio + HTTP): deploy with `progress: true` sees `notifications/progress`, `streamLogs: true` sees gated `notifications/message`
- Keep `debugLog`; add debug line with envelope `clientInfo` + protocol version for support

**Files:** `src/cli.ts`, `src/tool-handler.ts`, `test/helpers/cli.test.ts`

---

## P0 — Deterministic tools/list + cache hints

### 6. Stable tool order + CacheableResult ✅
**Why:** spec: tools/list SHOULD be deterministic (client caching, LLM prompt-cache hit rate); list results require `ttlMs` + `cacheScope`.

**Status:** ✅ DONE — registerJunoTools sorts by name (localeCompare) per domain array (domain call order fixed in buildServer → deterministic global order; spec asks deterministic, not global alphabetical). Cache hints: `McpServer` 2nd options arg `cacheHints: { "tools/list": { ttlMs: 3_600_000, cacheScope: "public" } }` (ServerOptions type). SDK auto-fills required ttlMs/cacheScope (default 0/private) so wire was already conformant; hint overrides. Verified on raw 2026 wire: `"ttlMs":3600000, "cacheScope":"public"` present; 2025-era response has NO ttlMs (codec never-stamp guarantee). Note: SDK typed results StripWireOnly-hide cache fields (client response-cache consumes them internally). Also learned: 2026-era raw requests carry the envelope at `params._meta` (NOT top-level `_meta`) — client `_envelopeOutbound` spreads it into params.
- `src/registered-tool.ts` `registerJunoTools`: sort by `name` (alphabetical) before registering — stable across file/registration refactors
- Add cache hints: toolset is static → `ttlMs` high (e.g. 3_600_000), `cacheScope: 'public'`. Check v2 `McpServer`/`registerTool` options for cacheable-result support; wire whatever the SDK exposes
- Verify `server/discover` advertises `tools: {}` capability (SDK handles; confirm in Inspector)

**Files:** `src/registered-tool.ts`, `src/index.ts`, `test/tools/**`

---

## P1 — Streamable HTTP transport (headline feature)

### 7. Optional HTTP mode ✅
**Why:** biggest capability jump this spec unlocks: stateless request/response, load-balancable, works from web clients (ChatGPT, Claude web). Server was stdio-only.

**Status:** ✅ DONE — added `@modelcontextprotocol/node@^2.0.0` (dep). New `src/http.ts`: `createHttpHandler()` = `createMcpHandler(() => buildServer(), { onerror })`, default legacy `'stateless'` (2025-era served per-request; 2026-07-28 via `server/discover`); `createNodeHandler()` → `toNodeHandler(...)`; `startHttpServer(port)` binds `127.0.0.1` (default 3000, `JUNO_MCP_PORT`). Entry split: new `src/main.ts` (bin → `dist/main.js`) does transport switch on `JUNO_MCP_TRANSPORT` (default stdio dual-era); `src/index.ts` is now a pure `buildServer()` factory (no side effects) — also resolved a latent index↔http circular import.
Security: audit-override `@hono/node-server ^2.0.5` (transitive of `@modelcontextprotocol/node` pinned vulnerable 1.19.17; Windows path-traversal GHSA-frvp-7c67-39w9; fixed by override, 0 vulns).
Verification: `test/http.test.ts` (3 tests) — in-process 2026-07-28 client (versionNegotiation pin + injected fetch → `handler.fetch`) lists 18 tools deterministically; legacy client (no negotiation) works over same handler; raw legacy `initialize` over real socket (`startHttpServer(0)`) answers 200 SSE. Live probe: modern `server/discover` over actual HTTP with `Mcp-Method`/`Mcp-Name` headers → `supportedVersions:["2026-07-28"]`. README: HTTP mode section + curl example + localhost security note.

### 8. Auth posture (follow-up)
**Why:** spec 2026 has real authorization requirements (RFC 9207 `iss` validation, SEP-2352 credential isolation, DCR/TLS). Auto-binding OAuth into the SDK is available but nonzero work.

**Do (later, not now):**
- Default: localhost-only HTTP mode, documented as unauth dev mode
- Then: enable v2 SDK OAuth opt-ins (`iss` pass-through, `discoveryState()`, issuer-stamped credentials)

**Files:** `src/http.ts`, `README.md`

---

## P1 — MRTR pilot (`input_required`)

### 9. Replace fragile stdin automation with MRTR (pilot one flow) ✅
**Why:** interactive juno prompts are currently handled by timing-based stdin injection (`setupStdinAutomation`, `StdinConfig`) — fragile, invisible to the model. MRTR asks the client for exactly the missing input and the model can answer.

**Status:** ✅ DONE — pilot flow: `juno_login` credentials-encryption passphrase prompt (nameable input; scope guard respected — no forced mapping of positional prompt sequences).
- `src/mrtr/state.ts`: `createRequestStateCodec` (HMAC, key `JUNO_MCP_STATE_SECRET` or per-process random; signed-not-encrypted — payload carries flow bookkeeping only); `verifyRequestState` wired as `ServerOptions.requestState.verify` (tampered/expired state → `-32602` before the handler runs).
- `src/mrtr/login.ts`: round A spawns `juno login`, watches stdout for the passphrase prompt, kills the child and returns `inputRequired` (embedded form elicitation over `z.object({passphrase: z.string().min(4)})` + minted state); round B verifies state, reads `acceptedContent(ctx.mcpReq.inputResponses, PASSWORD_INPUT_KEY, schema)`, re-runs login feeding the passphrase via prompt-mode stdin automation. Non-interactive runs (JUNO_TOKEN/--headless) complete in one trip.
- `juno_login` tool registered (identity, env flags); `RegisteredToolHandler` widened to `CallToolResult | InputRequiredResult`. Legacy 2025-era clients keep working via the SDK's default `inputRequired.legacyShim`.
- Stdin automation KEPT as fallback (still the executor's generic mechanism; MRTR is not forced on other prompts).

**Findings (SDK v2):** `callTool` takes the OBJECT form `{name, arguments}` — the v1 `(name, args)` pair string-spreads the name on the wire (`params:{"0":"j",...}` → server `-32602 params.name`). Modern retry carries `inputResponses` + `requestState` TOP-LEVEL in `params` (sibling of `_meta`); client must advertise `capabilities.elicitation` or the server refuses `input_required` with `-32021`. Client auto-fulfilment dispatches embedded elicitation to `setRequestHandler("elicitation/create")`. `ElicitInputParams` wants `message` + `requestedSchema` (title/name not in the type). Codec is async (`await mint/verify`); key ≥32 bytes.

**Tests:** fake juno CLI fixture (`test/fixtures/fake-juno/juno`; extension-less scripts inherit repo `"type": "module"` → ESM imports), `createTestClient` env/PATH overrides; 3 e2e stdio tests (modern auto-fulfil round-trip, legacy shim round-trip, wrong passphrase → isError) + 3 codec unit tests. 353 tests green, build/ultracite/audit clean. `ponytail:` prompt contract is "juno asks once for a passphrase"; a future y/N or confirmation gate fails loudly → run `juno login` in a terminal.

---

## P2 — Polish

### 10. OTel trace context propagation ✅
**Why:** spec documents `_meta` `traceparent`/`tracestate`/`baggage` (SEP-414). Forwarding the trace into the juno CLI child env makes CLI API calls join the client's trace — real value in HTTP-mode support debugging.

**Status:** ✅ DONE — `src/trace.ts`: `TraceContext` type, `extractTraceContext(ctx)` (reads plain `_meta` keys — NOT io.* envelope keys; defensive on non-strings; undefined when absent), `traceEnv(trace)`. `RunProcessOptions.trace` merged into child env in `src/executor.ts`. Single extraction point `makeTraceLogger(ctx)` in `src/cli.ts` (debug-logs when present) — used in `execByStrategy` (all 3 strategies) and both `handleLogin` rounds. `execCli`/`execWithRetry`/`execWithStreaming` gain trailing optional `trace` param (trace survives retry legs). 8 new tests (`test/trace.test.ts`: extraction inclusion/ignores, env mapping, runProcess child-env propagation). 358 tests green. Note: SDK v2 client does NOT emit traceparent by default — only forwarded when the client supplies it.

**Files:** `src/trace.ts`, `src/executor.ts`, `src/cli.ts`, `src/tool-handler.ts`, `src/mrtr/login.ts`

### 11. ADR + README
- `docs/adr/005-sdk-v2-stateless.md`: Context / Decision / Consequences / "Revisit if" coda
- README: Node 20+ requirement, HTTP mode, protocol-version compatibility note (dual-era serving)
- Explicitly note features we deliberately don't adopt (deprecated): Roots, Sampling, `logging/setLevel`, HTTP+SSE

**Files:** `docs/adr/005-sdk-v2-stateless.md`, `README.md`

---

## Carry-over backlog (still open from previous TODO)

- Per-tool retry config (`RetryConfig` plumbed through `ToolHandlerConfig`)
- SIGKILL fallback after SIGTERM timeout in `executor.ts`
- Juno CLI min-version check (`getCliVersion`, cached, `--skip-version-check`)
- Batch-size auto-tuning capped at source-file count (`hosting deploy`)
- Version-aware progress patterns (`src/progress-patterns.ts`)
- Docs-catalog auto-generation from Juno docs repo (`scripts/generate-docs-catalog.ts`)
- `CONTRIBUTING.md`

## Suggested execution order

1. P0-1 codemod + package swap + build green → 2. P0-2/P0-3 (sendNotification, gating, sort order) → 3. P0 verify with MCP Inspector (stdio, both eras) → 4. P1-1 HTTP mode → 5. P1-2 MRTR pilot → 6. P2 items.

## Verify checklist (after P0)

- `serveStdio` spawn works; 2025-era client (current Claude Desktop) still connects
- 2026-era probe (`client versionNegotiation: 'auto'`) discovers server, `_meta.serverInfo` stamped
- Progress + log notifications reach client only when allowed (logLevel gating)
- `tools/list` alphabetical + cache hints present
- Full test suite + `npm exec -- ultracite check` green