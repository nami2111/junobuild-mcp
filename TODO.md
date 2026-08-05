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

### 1. Split-package migration
**Why:** v1 SDK never puts a 2026-07-28 byte on the wire. Everything else depends on this.

**Do:**
- `package.json`: drop `@modelcontextprotocol/sdk`, add `@modelcontextprotocol/server@^2.0.0` (+ `@modelcontextprotocol/core` if we import raw `*Schema` constants — currently we only import types; add only what imports demand)
- Run `npx @modelcontextprotocol/codemod@latest v1-to-v2 .` at repo root; then `grep -rn '@mcp-codemod-error' .` and fix markers by hand
- Run `npm exec -- ultracite fix` after codemod (it rewrites AST without reformatting)
- Update test files: mocked v1 imports (`@modelcontextprotocol/sdk/server/mcp.js` etc.) → v2 packages; `test/test-utils.ts` mock server rewire

**Files:** `package.json`, `package-lock.json`, `src/**`, `test/**`

### 2. Swap stdio entry for `serveStdio` factory
**Why:** a hand-constructed `Server`/`McpServer` + `StdioServerTransport` serves only 2025-era. `serveStdio(() => buildServer())` negotiates era per connection.

**Do:**
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

### 4. Gate `notifications/message` on per-request `logLevel`
**Why:** spec: servers MUST NOT emit `notifications/message` for requests whose `_meta` lacked `io.modelcontextprotocol/logLevel`. Current `streamLogs` emits unconditionally → violates 2026 wire.

**Do:**
- Replace `makeLogCallback(extra, logger)` in `src/cli.ts` with v2 gated path: `ctx.mcpReq.log()` (auto gates on envelope `logLevel`; absent = silently opt-out) — or read `ctx.mcpReq.envelope['io.modelcontextprotocol/logLevel']` manually and skip when absent
- `streamLogs` param keeps working on 2025-era clients (session-scoped `logging/setLevel` still honored by SDK legacy path)

**Files:** `src/cli.ts`, `src/tool-handler.ts`, `test/helpers/cli.test.ts`

### 5. Fix progress notifications wiring (verify against real client)
**Why:** current `makeProgressCallback` reads `extra._meta.progressToken` + `extra.sendNotification`, but tests inject `sendNotification` manually — at runtime with a real v1 client this may never fire. Under 2026, progress is request-scoped on the response stream; must be re-done on v2 API and validated.

**Do:**
- Port `makeProgressCallback` to v2 notify mechanism; read `progressToken` from `ctx.mcpReq.envelope._meta`
- Integration-check with MCP Inspector (stdio + HTTP): deploy with `progress: true` sees `notifications/progress`, `streamLogs: true` sees gated `notifications/message`
- Keep `debugLog`; add debug line with envelope `clientInfo` + protocol version for support

**Files:** `src/cli.ts`, `src/tool-handler.ts`, `test/helpers/cli.test.ts`

---

## P0 — Deterministic tools/list + cache hints

### 6. Stable tool order + CacheableResult
**Why:** spec: tools/list SHOULD be deterministic (client caching, LLM prompt-cache hit rate); list results require `ttlMs` + `cacheScope`.

**Do:**
- `src/registered-tool.ts` `registerJunoTools`: sort by `name` (alphabetical) before registering — stable across file/registration refactors
- Add cache hints: toolset is static → `ttlMs` high (e.g. 3_600_000), `cacheScope: 'public'`. Check v2 `McpServer`/`registerTool` options for cacheable-result support; wire whatever the SDK exposes
- Verify `server/discover` advertises `tools: {}` capability (SDK handles; confirm in Inspector)

**Files:** `src/registered-tool.ts`, `src/index.ts`, `test/tools/**`

---

## P1 — Streamable HTTP transport (headline feature)

### 7. Optional HTTP mode
**Why:** biggest capability jump this spec unlocks: stateless request/response, load-balancable, works from web clients (ChatGPT, Claude web). Server is stdio-only today.

**Do:**
- Add `@modelcontextprotocol/node` dep; `toNodeHandler` + `createMcpHandler(() => buildServer())` (default `legacy: 'stateless'` serves both eras with same factory as stdio)
- Env config: `JUNO_MCP_TRANSPORT=http` (+ `JUNO_MCP_PORT` default 3000, bind `127.0.0.1`)
- Stateless fits: all state already in params (mode/profile/satellite per call); no `Mcp-Session-Id`, no session keying needed
- README: HTTP section, curl example, security note
- Tests: drive `handler.fetch` in-process (docs: `StreamableHTTPClientTransport` against `handler.fetch(new Request(...))`, no sockets); stdio-era coverage via child-process spawn of `serveStdio`

**Files:** `src/index.ts` (new `src/http.ts`), `package.json`, `README.md`, `test/**`

### 8. Auth posture (follow-up)
**Why:** spec 2026 has real authorization requirements (RFC 9207 `iss` validation, SEP-2352 credential isolation, DCR/TLS). Auto-binding OAuth into the SDK is available but nonzero work.

**Do (later, not now):**
- Default: localhost-only HTTP mode, documented as unauth dev mode
- Then: enable v2 SDK OAuth opt-ins (`iss` pass-through, `discoveryState()`, issuer-stamped credentials)

**Files:** `src/http.ts`, `README.md`

---

## P1 — MRTR pilot (`input_required`)

### 9. Replace fragile stdin automation with MRTR (pilot one flow)
**Why:** interactive juno prompts (login email/password, destructive confirmations) are currently handled by timing-based stdin injection (`setupStdinAutomation`, `StdinConfig`) — fragile, invisible to the model. MRTR asks the client for exactly the missing input and the model can answer.

**Do:**
- Pilot ONE flow, e.g. `juno login` credential prompt or a destructive-op confirm
- v2 shape: handler returns `inputRequired({ inputRequests, requestState })`; state threaded via `ctx.mcpReq.requestState()` + `createRequestStateCodec({ key })` (HMAC; `ServerOptions.requestState.verify`); SDK shims MRTR to 2025-era clients over elicitation/sampling/roots — legacy clients keep working
- Keep stdin automation as fallback for prompts that are positional (not nameable inputs) and for non-MRTR clients where the shim can't show input types
- Scope guard: MRTR needs a nameable input + a juno prompt that maps to it; many juno prompts are positional sequences → don't force it

**Files:** new `src/mrtr/` (codec, flows), `src/tool-handler.ts`, `src/tools/identity.ts` (login), tests

---

## P2 — Polish

### 10. OTel trace context propagation
**Why:** spec documents `_meta` `traceparent`/`tracestate`/`baggage` (SEP-414). Forwarding the trace into the juno CLI child env makes CLI API calls join the client's trace — real value in HTTP-mode support debugging.

**Do:** read keys from `ctx.mcpReq.envelope._meta`; set `traceparent` (+ `tracestate`/`baggage`) on `child_process` env in `executor.ts`; debug-log when present.

**Files:** `src/executor.ts`, `src/cli.ts`

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