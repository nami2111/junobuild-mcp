import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { Tool } from "@modelcontextprotocol/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestClient, createTestDir } from "../test-utils.js";

describe.runIf(process.env.JUNO_E2E)("MCP Server E2E", () => {
  let clientWrapper: Awaited<ReturnType<typeof createTestClient>>;
  let testDir: string;
  let projectDir: string;

  beforeAll(async () => {
    testDir = createTestDir("core-test");
    mkdirSync(testDir, { recursive: true });
    projectDir = join(testDir, "my-juno-app");

    clientWrapper = await createTestClient(testDir);
  });

  afterAll(async () => {
    await clientWrapper.cleanup();
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should list tools successfully", async () => {
    const list = await clientWrapper.client.listTools();
    const toolNames = list.tools.map((t: Tool) => t.name);

    expect(toolNames.length).toBeGreaterThan(0);
    expect(toolNames).toContain("juno_create_project");
    expect(toolNames).toContain("juno_hosting_deploy");
  });

  it("should successfully call juno_create_project tool", async () => {
    const result = await clientWrapper.client.callTool({
      name: "juno_create_project",
      arguments: {
        directory: "my-juno-app",
        template: "react-ts-starter",
        packageManager: "npm",
      },
    });

    expect(result.isError).not.toBe(true);

    expect(existsSync(projectDir)).toBe(true);
    expect(existsSync(join(projectDir, "package.json"))).toBe(true);
  }, 120_000);
});
