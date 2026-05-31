# ADR-004: Docs caching strategy

**Status:** Accepted
**Date:** 2026-05-31

## Context

The `juno_docs` tool fetches Markdown pages from the public Juno docs repo on GitHub (`https://github.com/junobuild/docs/tree/main/docs`). The catalog covers ~159 topics across guides, references, and component docs.

Each `juno_docs({ topic })` call would, naively, perform an HTTPS round trip to `raw.githubusercontent.com`. In practice, an LLM agent working through a Juno task typically reads several adjacent topics (e.g., `build_datastore`, `build_datastore_collections`, `build_datastore_development`) within one conversation, and the same agent — or another one on the same machine — may revisit those topics minutes later.

Constraints:
- Docs are public and not user-specific, so cross-call sharing within the process is safe.
- Content does change (new releases, edits), but on a scale of hours to days, not seconds. Stale content for a short window is acceptable; stale-forever is not.
- An MCP server is a long-lived process — caching survives across many tool calls within a session, but does *not* survive process restart.
- The catalog has a known upper bound (~159 topics), so an unbounded cache cannot grow indefinitely. But the working set per session is small (typically <20).
- We previously used a plain `Map` with a "delete first key" eviction policy. That worked but relied on undocumented Map iteration order and didn't track recency at all.

## Decision

In-memory LRU cache with a TTL, scoped to the MCP server process.

Implementation (`src/docs-catalog.ts`, `src/lru-cache.ts`):

| Parameter         | Value         | Rationale                                                    |
| ----------------- | ------------- | ------------------------------------------------------------ |
| Cache type        | LRU           | Doubly-linked list + `Map<K, Node>` for O(1) get/set/evict   |
| `MAX_CACHE_SIZE`  | 50 entries    | Comfortable headroom over typical working set; bounded growth |
| `CACHE_TTL_MS`    | 1 hour        | Balance between freshness and avoiding repeat fetches        |
| Eviction trigger  | On `set` over capacity, or on expired hit  | Lazy — no background timer       |

Behaviour:
- `get(topic)`: if hit and not expired, return cached content and bump recency. If expired, evict and refetch.
- `set(topic, content)`: insert at MRU end; if over capacity, evict LRU tail.
- `cleanupExpired()`: iterates entries, collects expired keys into an array first, then deletes (avoids iterator-invalidation footguns).
- Responses are truncated to `CHARACTER_LIMIT` (default 25 000 chars, configurable via `JUNO_MCP_CHAR_LIMIT`) before being cached, so the cache footprint per entry is bounded.

The cache is intentionally **not** persisted to disk. Persistence would add filesystem coupling, install-location decisions, and cross-version migration concerns for a benefit (warm cache on restart) that doesn't outweigh those costs for an MCP server.

## Consequences

**Positive**
- Repeat reads of the same topic within a session are effectively free after the first fetch.
- LRU eviction order is explicit and tested (`test/helpers/lru-cache.test.ts`, 14 cases), no longer dependent on Map iteration semantics.
- TTL ensures users who keep the server running for days don't see arbitrarily stale docs.
- Bounded by `MAX_CACHE_SIZE`, so memory usage is predictable regardless of how many topics get touched over a long session.

**Negative**
- Content updated in the docs repo within the TTL window is invisible to the cache. Users who explicitly want fresh content have to restart the MCP server. This is acceptable for documentation content, which rarely has hot-fix urgency.
- The cache is per-process, not per-host. Two MCP clients running two servers don't share. That's a deliberate simplification — coordinating a shared cache (e.g., file or socket) would dwarf the win.
- LRU + TTL semantics mean a popular-but-stale entry stays cached up to the full hour, while a rarely-accessed-but-fresh entry might be evicted by capacity pressure. For docs, this tradeoff favours hot topics, which is the right default.

**Revisit if**
- Doc topics start changing frequently enough that 1 h staleness causes user confusion.
- The catalog grows to a scale where 50 entries is no longer enough headroom for typical sessions.
- A shared/persistent cache becomes valuable (e.g., for CI environments that re-spawn the server per task).
