import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestClient, createTestDir } from "./test-utils.js";
import { existsSync, mkdirSync, rmSync } from "node:fs";

describe("Identity E2E", () => {
  let clientWrapper: Awaited<ReturnType<typeof createTestClient>>;
  let testDir: string;

  beforeAll(async () => {
    testDir = createTestDir("identity-test");
    mkdirSync(testDir, { recursive: true });
    clientWrapper = await createTestClient(testDir);
  });

  afterAll(async () => {
    await clientWrapper.cleanup();
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should return version information", async () => {
    const result = await clientWrapper.client.callTool({
      name: "juno_version",
      arguments: {}
    });
    
    expect(!!result.isError).toBe(false);
    const content: any = result.content;
    expect(content[0].type).toBe("text");
    expect(content[0].text).toBeDefined();
  });

  it("should call whoami successfully (returns info or authenticated error)", async () => {
    const result = await clientWrapper.client.callTool({
      name: "juno_whoami",
      arguments: {}
    });
    
    expect(!!result.isError).toBe(true); // Fails since no auth
    const content: any = result.content;
    expect(content[0].text).toBeDefined();
  });

  it("should call open satellite successfully", async () => {
    const result = await clientWrapper.client.callTool({
      name: "juno_open",
      arguments: {}
    });
    
    const content: any = result.content;
    expect(content[0].text).toBeDefined();
  });

  it("should call run script successfully", async () => {
    const result = await clientWrapper.client.callTool({
      name: "juno_run",
      arguments: { src: "nonexistent.js" }
    });
    
    const content: any = result.content;
    expect(content[0].text).toContain("nonexistent.js");
  });
});
