import { existsSync, mkdirSync, rmSync } from "node:fs";
import type { TextContent } from "@modelcontextprotocol/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestClient, createTestDir } from "../test-utils.js";

describe.runIf(process.env.JUNO_E2E)("Tools E2E", () => {
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
        writeFile: false,
      },
    });

    expect(!!result.isError).toBe(false);
    const content = result.content as TextContent[];
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
        path: "juno.config.json",
      },
    });

    expect(!!result.isError).toBe(false);
    const content = result.content as TextContent[];
    expect(content[0].text).toContain("Config written");
  });

  it("should reject path traversal in config init", async () => {
    const result = await clientWrapper.client.callTool({
      name: "juno_config_init",
      arguments: {
        format: "json",
        source: "build",
        satelliteId: "aaaaa-bbbbb-ccccc-ddddd-cai",
        multiEnv: false,
        writeFile: true,
        path: "../../../etc/passwd",
      },
    });

    expect(result.isError).toBe(true);
    const content = result.content as TextContent[];
    expect(content[0].text).toContain("traversal");
  });

  it("should call config apply", async () => {
    const result = await clientWrapper.client.callTool({
      name: "juno_config_apply",
      arguments: {},
    });

    const content = result.content as TextContent[];
    expect(content[0].text).toBeDefined();
  });

  it("should deploy hosting", async () => {
    const result = await clientWrapper.client.callTool({
      name: "juno_hosting_deploy",
      arguments: { batch: 10 },
    });

    const content = result.content as TextContent[];
    expect(content[0].text).toBeDefined();
  });

  it("should list changes", async () => {
    const result = await clientWrapper.client.callTool({
      name: "juno_changes_list",
      arguments: {},
    });

    const content = result.content as TextContent[];
    expect(content[0].text).toBeDefined();
  });

  it("should fetch docs", async () => {
    const result = await clientWrapper.client.callTool({
      name: "juno_docs",
      arguments: { topic: "intro" },
    });

    expect(!!result.isError).toBe(false);
    const content = result.content as TextContent[];
    expect(content[0].text).toContain("Juno");
  });

  it("should return version information", async () => {
    const result = await clientWrapper.client.callTool({
      name: "juno_version",
      arguments: {},
    });

    expect(!!result.isError).toBe(false);
    const content = result.content as TextContent[];
    expect(content[0].type).toBe("text");
    expect(content[0].text).toBeDefined();
  });

  it("should call run script successfully", async () => {
    const result = await clientWrapper.client.callTool({
      name: "juno_run",
      arguments: { src: "nonexistent.js" },
    });

    const content = result.content as TextContent[];
    expect(content[0].text).toContain("nonexistent.js");
  });
});
