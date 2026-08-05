# ADR-005: SDK v2 split-package migration and stateless serving

**Status:** Accepted
**Date:** 2026-07-28

## Context

The MCP spec revision dated 2026-07-28 moves the protocol to a stateless model: no connection-scoped `initialize` handshake; every request carries its own `_meta` envelope with protocol version, client capabilities, client info, and (optionally) log level; clients negotiate via `server/discover`; servers may request missing inputs mid-call (MRTR via `input_required`) and may hint result cacheability.

The previous SDK (`@modelcontextprotocol/sdk@1.x`, still in use at the time of writing) could never emit a 2026-07-28 byte on the wire — its transport layer is built around the 2025-era session handshake. Serving the new protocol therefore requires the SDK v2 split packages (`@modelcontextprotocol/server`, `@modelcontextprotocol/client`, `@modelcontextprotocol/node`).

Constraints and context:

- Existing clients (e.g., Claude Desktop mid-2026) still speak the 2025 era: `initialize` → session.
- The server must not break them while we adopt the new era.
- We wrap the juno CLI via `child_process`; every tool call is an I/O-bound side effect, so request-scoped state (as opposed to session-scoped) matches our model naturally.
- Streaming tools emit `notifications/progress` and `notifications/message`; gating rules changed between eras (`logging/setLevel` vs per-request `_meta.logLevel`).

## Decision

Migrate to the SDK v2 split packages and serve both protocol eras from a single toolset.

Concrete choices:

| Area | Decision |
| --- | --- |
| Packages | `@modelcontextprotocol/server@2`, `@modelcontextprotocol/node@2` (deps); `@modelcontextprotocol/client@2` (devDep, test-only) |
| Entry structure | `src/index.ts` exports a pure `buildServer()` factory (no side effects); `src/main.ts` is the bin and picks the transport (`JUNO_MCP_TRANSPORT=http` or stdio) |
| Stdio | `serveStdio(buildServer, { legacy: "serve" })` — 2025-era connections are pinned to the legacy era and served, not rejected |
| HTTP | `createMcpHandler(buildServer)` from `@modelcontextprotocol/server` (default `legacy: "stateless"`); both eras on one endpoint, stateless per request |
| Version negotiation | Default is dual-era serving; later switch to `legacy: "reject"` once legacy clients are gone |
| tools/list determinism | Per-domain alphabetical registration + `cacheHints: { ttlMs: 3_600_000, cacheScope: "public" }` (static toolset) |
| Log gating | Delegated to the SDK: `ctx.mcpReq.log()` (2026 per-request `_meta.logLevel`, absent = silently opt-out) and legacy `logging/setLevel` are handled by the SDK; no manual gating in server code |
| Progress | `ctx.mcpReq.notify()` (request-scoped), `progressToken` read as a plain `_meta` key |
| MRTR | One pilot flow (`juno_login` passphrase) using `inputRequired()` + `createRequestStateCodec` (HMAC), with the SDK shimming MRTR to 2025-era clients |
| OTel | `traceparent`/`tracestate`/`baggage` (plain `_meta` keys, SEP-414) forwarded into the juno CLI child env |
| Deliberately not adopted | Roots, Sampling, `logging/setLevel` (2026-era), HTTP+SSE endpoint — all deprecated or out of scope for a tool runner (see Consequences) |

**Envelope shape on the 2026-07-28 wire.** Envelope keys (`io.modelcontextprotocol/protocolVersion`, `clientCapabilities`, `clientInfo`, `logLevel`) live *inside* `params._meta`. MRTR retries carry `inputResponses` and `requestState` at the top level of `params` (siblings of `_meta`), not inside the envelope. Trace keys are plain `_meta` keys (no `io.*` prefix).

## Consequences

**Positive**

- Both eras served from one factory; the same toolset, schemas, and handlers serve every client.
- Stateless HTTP mode maps cleanly onto web clients/load balancers (no session affinity needed); stdio remains the default for local setups.
- The SDK shims MRTR to legacy clients, so the `juno_login` flow works for both eras without duplicated code.
- log gating moved into the SDK: fewer places to get the wire format wrong.
**Negative**

- 2025-era features that the new world replaces (session-scoped `logging/setLevel`, sampling/roots as the only input mechanism) are not adopted — legacy clients that *require* them (a client built on Sampling as the only input mechanism) will not get their full UX; the standard legacy shim path covers elicitation-style inputs instead.
- Two eras means two wire shapes to keep straight in tests (e.g., where envelope keys live, how retries carry `inputResponses`). The test suite therefore has era-specific end-to-end tests.
- The v2 client API differs from v1 in places (e.g., `callTool` takes `{ name, arguments }`, not `(name, args)`); migration cost is on client-side consumers.

**Revisit if**

- All mainstream clients have moved to 2026-07-28 → switch default to `legacy: "reject"` in both `serveStdio` and `createMcpHandler`, delete the legacy-era tests and the shim paths.
- A request for `roots`/`sampling` support materializes (e.g., a client ecosystem expects the server to expose them) → add them as first-class capabilities; they are currently not adopted deliberately.