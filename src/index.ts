#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/server";
import { verifyRequestState } from "./mrtr/state.js";
import { registerChangesTools } from "./tools/changes.js";
import { registerConfigTools } from "./tools/config.js";
import { registerDocsTools } from "./tools/docs.js";
import { registerFunctionsTools } from "./tools/functions.js";
import { registerHostingTools } from "./tools/hosting.js";
import { registerIdentityTools } from "./tools/identity.js";
import { registerProjectTools } from "./tools/project.js";

const pkgPath = fileURLToPath(new URL("../package.json", import.meta.url));
const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version: string };

export function buildServer(): McpServer {
  const server = new McpServer(
    {
      name: "junobuild-mcp-server",
      version: pkg.version,
    },
    {
      // Log gating (SEP-2577): deprecated but served through the 12-month
      // window — 2026-era per-request _meta.logLevel, legacy logging/setLevel.
      capabilities: { logging: {} },
      // Static toolset: allow clients/intermediaries to cache tools/list.
      cacheHints: {
        "tools/list": { ttlMs: 3_600_000, cacheScope: "public" },
      },
      // MRTR requestState (juno_login passphrase flow): HMAC-verified;
      // tampered/expired state is refused before the handler runs (-32602).
      requestState: {
        verify: (state, ctx) => verifyRequestState(state, ctx),
      },
    }
  );

  registerIdentityTools(server);
  registerConfigTools(server);
  registerHostingTools(server);
  registerFunctionsTools(server);
  registerChangesTools(server);
  registerProjectTools(server);
  registerDocsTools(server);

  return server;
}
