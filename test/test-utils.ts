import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";

export const MCP_SERVER = join(process.cwd(), "dist/index.js");

export async function createTestClient(cwd?: string) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [MCP_SERVER],
    env: { ...process.env, FORCE_COLOR: "0" },
    cwd
  });

  const client = new Client(
    { name: "test-client", version: "1.0.0" },
    { capabilities: {} }
  );

  await client.connect(transport);

  const cleanup = async () => {
    await transport.close();
  };

  return { client, transport, cleanup };
}

export function createTestDir(prefix: string) {
  return join(tmpdir(), `juno-mcp-${prefix}-${randomUUID()}`);
}
