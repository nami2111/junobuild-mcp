import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { vi } from "vitest";
import type { CliResult } from "../src/types.js";

export const MCP_SERVER = join(process.cwd(), "dist/main.js");

export async function createTestClient(
  cwd?: string,
  options?: ConstructorParameters<typeof Client>[1],
  env?: Record<string, string>
) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [MCP_SERVER],
    env: { ...process.env, FORCE_COLOR: "0", ...env },
    cwd,
  });

  const client = new Client(
    { name: "test-client", version: "1.0.0" },
    { capabilities: {}, ...options }
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

export function createMockExecCli(
  overrides?: Partial<CliResult>
): ReturnType<typeof vi.fn> {
  const defaults: CliResult = { stdout: "", stderr: "", exitCode: 0 };
  return vi.fn().mockResolvedValue({ ...defaults, ...overrides });
}

export function createMockFormatResponse(overrides?: {
  text?: string;
  isError?: boolean;
}): ReturnType<typeof vi.fn> {
  return vi.fn().mockReturnValue({
    text: overrides?.text ?? "Success",
    isError: overrides?.isError ?? false,
  });
}
