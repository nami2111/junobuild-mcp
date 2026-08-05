#!/usr/bin/env node
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { buildServer } from "./index.js";

const transport = process.env.JUNO_MCP_TRANSPORT?.toLowerCase();

if (transport === "http") {
  const { DEFAULT_HTTP_PORT, HTTP_HOST, startHttpServer } = await import(
    "./http.js"
  );
  const port = Number(process.env.JUNO_MCP_PORT) || DEFAULT_HTTP_PORT;
  await startHttpServer(port);
  console.error(`Juno MCP server running via HTTP on ${HTTP_HOST}:${port}`);
} else {
  // Dual-era by default (legacy: 'serve'): 2025-era clients keep working while
  // 2026-07-28 clients negotiate via server/discover. Pin { legacy: 'reject' }
  // once all target clients speak the modern era.
  serveStdio(buildServer, {
    onerror: (error) => {
      console.error("Server error:", error);
    },
  });
  console.error("Juno MCP server running via stdio");
}