import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { createHttpHandler, startHttpServer } from "../src/http.js";
import type { Server } from "node:http";

const handler = createHttpHandler();

function inProcessTransport(): StreamableHTTPClientTransport {
  return new StreamableHTTPClientTransport(new URL("http://localhost/mcp"), {
    fetch: (input, init) => handler.fetch(new Request(input, init)),
  });
}

async function listTools(
  options: ConstructorParameters<typeof Client>[1] = {}
): Promise<string[]> {
  const client = new Client(
    { name: "http-test", version: "1.0.0" },
    { capabilities: {}, ...options }
  );
  try {
    await client.connect(inProcessTransport());
    const result = await client.listTools();
    return result.tools.map((tool) => tool.name);
  } finally {
    await client.close();
  }
}

describe("HTTP mode (createMcpHandler)", () => {
  it("serves 2026-07-28 era via server/discover negotiation", async () => {
    const names = await listTools({
      versionNegotiation: { mode: "pin", pin: "2026-07-28" },
    });
    expect(names).toHaveLength(19);
    // Deterministic per-domain ordering across requests.
    expect(await listTools({ versionNegotiation: { mode: "pin", pin: "2026-07-28" } })).toEqual(names);
  });

  it("serves 2025-era clients statelessly (legacy: 'stateless')", async () => {
    const names = await listTools();
    expect(names).toHaveLength(19);
    expect(names).toContain("juno_hosting_deploy");
  });
});

describe("HTTP mode (toNodeHandler over a real socket)", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = await startHttpServer(0);
    const address = server.address();
    if (typeof address !== "object" || address === null) {
      throw new Error("server.address() returned a non-TCP value");
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it("answers a legacy initialize over HTTP", async () => {
    const response = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "raw-test", version: "1.0.0" },
        },
      }),
    });
    expect(response.status).toBe(200);
    const text = await response.text();
    const dataLine = text
      .split(/\r?\n/)
      .find((line) => line.startsWith("data: "));
    expect(dataLine).toBeDefined();
    const body = JSON.parse(dataLine.slice(6)) as {
      result?: { protocolVersion?: string; serverInfo?: { name?: string } };
    };
    expect(body.result?.protocolVersion).toBe("2025-06-18");
    expect(body.result?.serverInfo?.name).toBe("junobuild-mcp-server");
  });
});
