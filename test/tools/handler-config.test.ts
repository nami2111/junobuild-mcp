import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleConfigInit, handleConfigApply } from "../../src/tools/config.js";
import { handleCreateProject } from "../../src/tools/project.js";
import { NETWORK_TIMEOUT } from "../../src/constants.js";

vi.mock("../../src/cli.js", () => ({
  execCli: vi.fn().mockResolvedValue({ stdout: "apply ok", stderr: "", exitCode: 0 }),
  formatResponse: vi.fn().mockReturnValue({ text: "apply ok", isError: false })
}));

vi.mock("../../src/executor.js", () => ({
  execCommandNonInteractive: vi.fn().mockResolvedValue({ stdout: "", stderr: "", exitCode: 0 })
}));

vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  rename: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue(JSON.stringify({ name: "temp" }))
}));

import { execCli, formatResponse } from "../../src/cli.js";
import { execCommandNonInteractive } from "../../src/executor.js";
const mockExecCli = vi.mocked(execCli);
const mockExecCmd = vi.mocked(execCommandNonInteractive);
const mockFormatResponse = vi.mocked(formatResponse);

describe("handleConfigInit", () => {
  const previewParams = {
    format: "typescript" as const,
    source: "dist",
    satelliteId: "abc-123",
    multiEnv: false,
    writeFile: false
  };

  it("returns preview content when writeFile is false", async () => {
    const result = await handleConfigInit(previewParams);
    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;
    expect(text).toContain("juno.config.ts");
    expect(text).toContain("abc-123");
    expect(text).toContain("Next Steps");
  });

  it("writes file when writeFile is true", async () => {
    const result = await handleConfigInit({
      ...previewParams,
      writeFile: true,
      path: "juno.config.ts"
    });
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain("Config written");
  });

  it("returns error on path traversal", async () => {
    const result = await handleConfigInit({
      ...previewParams,
      writeFile: true,
      path: "../../../etc/passwd"
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("traversal");
  });

  it("generates JSON config for json format", async () => {
    const result = await handleConfigInit({
      ...previewParams,
      format: "json"
    });
    const text = result.content[0].text;
    expect(text).toContain("juno.config.json");
  });

  it("generates JavaScript config for javascript format", async () => {
    const result = await handleConfigInit({
      ...previewParams,
      format: "javascript"
    });
    const text = result.content[0].text;
    expect(text).toContain("juno.config.js");
  });
});

describe("handleConfigApply", () => {
  it("calls execCli with config apply", async () => {
    await handleConfigApply({});
    expect(mockExecCli).toHaveBeenCalledWith("config", ["apply"], {}, NETWORK_TIMEOUT);
    expect(mockFormatResponse).toHaveBeenCalledWith(
      { stdout: "apply ok", stderr: "", exitCode: 0 },
      "Config Apply"
    );
  });

  it("passes --force flag", async () => {
    await handleConfigApply({ force: true });
    expect(mockExecCli).toHaveBeenCalledWith("config", ["apply", "--force"], {}, NETWORK_TIMEOUT);
  });

  it("passes mode and profile", async () => {
    await handleConfigApply({ mode: "production", profile: "main" });
    expect(mockExecCli).toHaveBeenCalledWith(
      "config",
      ["apply"],
      { mode: "production", profile: "main" },
      NETWORK_TIMEOUT
    );
  });
});

describe("handleCreateProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls execCommandNonInteractive with vite create", async () => {
    const result = await handleCreateProject({
      directory: "my-app",
      template: "sveltekit-starter",
      packageManager: "npm"
    });
    expect(mockExecCmd).toHaveBeenCalledWith(
      "npm",
      expect.arrayContaining(["create", "vite@latest"]),
      120_000
    );
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain("my-app");
  });

  it("defaults to react-ts-starter", async () => {
    await handleCreateProject({
      directory: "my-app",
      packageManager: "npm"
    });
    expect(mockExecCmd).toHaveBeenCalledWith(
      "npm",
      expect.arrayContaining(["--template", "react", "--template-ts"]),
      expect.any(Number)
    );
  });

  it("returns error when vite scaffold fails", async () => {
    mockExecCmd.mockResolvedValueOnce({ stdout: "", stderr: "vite error", exitCode: 1 });
    const result = await handleCreateProject({
      directory: "my-app",
      packageManager: "npm"
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("vite error");
  });
});
