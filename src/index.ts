#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerIdentityTools } from "./tools/identity.js";
import { registerConfigTools } from "./tools/config.js";
import { registerHostingTools } from "./tools/hosting.js";
import { registerEmulatorTools } from "./tools/emulator.js";
import { registerFunctionsTools } from "./tools/functions.js";
import { registerSnapshotTools } from "./tools/snapshot.js";
import { registerModuleTools } from "./tools/modules.js";
import { registerChangesTools } from "./tools/changes.js";
import { registerDocsTools } from "./tools/docs.js";

const pkgPath = fileURLToPath(new URL("../package.json", import.meta.url));
const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));

const server = new McpServer({
  name: "junobuild-mcp-server",
  version: pkg.version as string,
});

registerIdentityTools(server);
registerConfigTools(server);
registerHostingTools(server);
registerEmulatorTools(server);
registerFunctionsTools(server);
registerSnapshotTools(server);
registerModuleTools(server);
registerChangesTools(server);
registerDocsTools(server);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Juno MCP server running via stdio");
}

main().catch((error: unknown) => {
  console.error("Server error:", error);
  process.exit(1);
});
