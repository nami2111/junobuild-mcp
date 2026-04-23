import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestClient, createTestDir } from "./test-utils.js";
import { join } from "node:path";
import { existsSync, mkdirSync, rmSync } from "node:fs";

describe("MCP Server E2E", () => {
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
    const toolNames = list.tools.map((t: any) => t.name);
    
    expect(toolNames.length).toBeGreaterThan(0);
    expect(toolNames).toContain("juno_create_project");
    expect(toolNames).toContain("juno_hosting_deploy");
  });

  it("should successfully call juno_create_project tool", async () => {
    // Actually calling it might take some time, verify it doesn't error
    const result = await clientWrapper.client.callTool({
      name: "juno_create_project",
      arguments: {
        directory: "my-juno-app",
        template: "react-ts-starter",
        packageManager: "npm"
      }
    });

    expect(result.isError).not.toBe(true);
    
    // Project files should now exist
    expect(existsSync(projectDir)).toBe(true);
    expect(existsSync(join(projectDir, "package.json"))).toBe(true);
  }, 120_000);
});
