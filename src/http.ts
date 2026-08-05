import type { Server } from "node:http";
import { createServer } from "node:http";
import type { NodeMcpRequestHandler } from "@modelcontextprotocol/node";
import { toNodeHandler } from "@modelcontextprotocol/node";
import type { McpHttpHandler } from "@modelcontextprotocol/server";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { buildServer } from "./index.js";

export const DEFAULT_HTTP_PORT = 3000;
export const HTTP_HOST = "127.0.0.1";

const onerror = (error: Error) => console.error("Server error:", error);

// Same factory as stdio mode; legacy defaults to 'stateless' so 2025-era
// clients are served per-request while 2026-07-28 traffic negotiates via
// server/discover. Stateless fits this server: every tool already carries
// its full context in params (mode/profile/satellite), no session needed.
export function createHttpHandler(): McpHttpHandler {
  return createMcpHandler(() => buildServer(), { onerror });
}

export function createNodeHandler(): NodeMcpRequestHandler {
  return toNodeHandler(createHttpHandler(), { onerror });
}

export async function startHttpServer(
  port = DEFAULT_HTTP_PORT
): Promise<Server> {
  const server = createServer(createNodeHandler());
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, HTTP_HOST, resolve);
  });
  return server;
}
