#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
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
  const server = new McpServer({
    name: "junobuild-mcp-server",
    version: pkg.version,
  });

  registerIdentityTools(server);
  registerConfigTools(server);
  registerHostingTools(server);
  registerFunctionsTools(server);
  registerChangesTools(server);
  registerProjectTools(server);
  registerDocsTools(server);

  return server;
}

// Dual-era by default (legacy: 'serve'): 2025-era clients keep working while
// 2026-07-28 clients negotiate via server/discover. Pin { legacy: 'reject' }
// once all target clients speak the modern era.
serveStdio(buildServer, {
  onerror: (error) => {
    console.error("Server error:", error);
  },
});

console.error("Juno MCP server running via stdio");
