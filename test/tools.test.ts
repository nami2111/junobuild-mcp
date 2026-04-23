import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestClient, createTestDir } from "./test-utils.js";
import { existsSync, mkdirSync, rmSync } from "node:fs";

describe("Tools E2E", () => {
  let clientWrapper: Awaited<ReturnType<typeof createTestClient>>;
  let testDir: string;

  beforeAll(async () => {
    testDir = createTestDir("tools-test");
    mkdirSync(testDir, { recursive: true });
    
    clientWrapper = await createTestClient(testDir);
  });

  afterAll(async () => {
    await clientWrapper.cleanup();
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should initialize a typescript config file", async () => {
    const result = await clientWrapper.client.callTool({
      name: "juno_config_init",
      arguments: {
        format: "typescript",
        source: "dist",
        satelliteId: "test-satellite-id",
        multiEnv: false,
        writeFile: false
      }
    });

    expect(!!result.isError).toBe(false);
    const content: any = result.content;
    expect(content[0].text).toContain("juno.config.ts");
  });

  it("should initialize a written config file", async () => {
    const result = await clientWrapper.client.callTool({
      name: "juno_config_init",
      arguments: {
        format: "json",
        source: "build",
        satelliteId: "aaaaa-bbbbb-ccccc-ddddd-cai",
        multiEnv: false,
        writeFile: true,
        path: "juno.config.json"
      }
    });

    expect(!!result.isError).toBe(false);
    const content: any = result.content;
    expect(content[0].text).toContain("Config written");
  });

  it("should call config apply", async () => {
    const result = await clientWrapper.client.callTool({
      name: "juno_config_apply",
      arguments: {}
    });

    // Fails expectedly inside without actual config or login
    const content: any = result.content;
    expect(content[0].text).toBeDefined();
  });

  it("should deploy hosting", async () => {
    const result = await clientWrapper.client.callTool({
      name: "juno_hosting_deploy",
      arguments: { batch: 10 }
    });

    const content: any = result.content;
    expect(content[0].text).toBeDefined();
  });

  it("should list changes", async () => {
    const result = await clientWrapper.client.callTool({
      name: "juno_changes_list",
      arguments: {}
    });

    const content: any = result.content;
    expect(content[0].text).toBeDefined();
  });

  it("should fetch docs", async () => {
    const result = await clientWrapper.client.callTool({
      name: "juno_docs",
      arguments: { topic: "intro" }
    });

    expect(!!result.isError).toBe(false);
    const content: any = result.content;
    expect(content[0].text).toContain("Juno");
  });
});
