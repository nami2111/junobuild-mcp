import { describe, expect, it, vi } from "vitest";
import { NETWORK_TIMEOUT } from "../../src/constants.js";
import {
  handleAuthStatus,
  handleRunScript,
  handleStatus,
  handleVersion,
} from "../../src/tools/identity.js";

vi.mock("../../src/cli.js", () => ({
  execCli: vi.fn().mockResolvedValue({ stdout: "ok", stderr: "", exitCode: 0 }),
  formatResponse: vi.fn().mockReturnValue({ text: "ok", isError: false }),
  makeTraceLogger: vi.fn().mockReturnValue(undefined),
}));

import { execCli, formatResponse } from "../../src/cli.js";

const mockExecCli = vi.mocked(execCli);
const mockFormatResponse = vi.mocked(formatResponse);

describe("handleVersion", () => {
  it("calls execCli with version command", async () => {
    const result = await handleVersion({});
    expect(mockExecCli).toHaveBeenCalledWith(
      "--version",
      [],
      undefined,
      NETWORK_TIMEOUT,
      undefined
    );
    expect(mockFormatResponse).toHaveBeenCalledWith(
      { stdout: "ok", stderr: "", exitCode: 0 },
      "Version"
    );
    expect(result).toEqual({
      content: [{ type: "text", text: "ok" }],
      isError: false,
    });
  });
});

describe("handleRunScript", () => {
  it("calls execCli with run and -s flag", async () => {
    await handleRunScript({ src: "deploy.ts" });
    expect(mockExecCli).toHaveBeenCalledWith(
      "run",
      ["-s", "deploy.ts"],
      {},
      NETWORK_TIMEOUT,
      undefined
    );
  });

  it("passes mode and profile", async () => {
    await handleRunScript({
      src: "test.js",
      mode: "development",
      profile: "dev",
    });
    expect(mockExecCli).toHaveBeenCalledWith(
      "run",
      ["-s", "test.js"],
      { mode: "development", profile: "dev" },
      NETWORK_TIMEOUT,
      undefined
    );
  });
});

describe("handleStatus", () => {
  it("calls execCli with status command", async () => {
    await handleStatus({});
    expect(mockExecCli).toHaveBeenCalledWith(
      "status",
      [],
      {},
      NETWORK_TIMEOUT,
      undefined
    );
  });

  it("passes container-url and console-url", async () => {
    await handleStatus({
      containerUrl: "https://container.example.com",
      consoleUrl: "https://console.example.com",
    });
    expect(mockExecCli).toHaveBeenCalledWith(
      "status",
      [],
      {
        containerUrl: "https://container.example.com",
        consoleUrl: "https://console.example.com",
      },
      NETWORK_TIMEOUT,
      undefined
    );
  });
});

describe("handleAuthStatus", () => {
  it("calls execCli with whoami command", async () => {
    await handleAuthStatus({});
    expect(mockExecCli).toHaveBeenCalledWith(
      "whoami",
      [],
      {},
      NETWORK_TIMEOUT,
      undefined
    );
    expect(mockFormatResponse).toHaveBeenCalledWith(
      { stdout: "ok", stderr: "", exitCode: 0 },
      "Auth Status"
    );
  });

  it("passes mode, profile, and url overrides", async () => {
    await handleAuthStatus({
      mode: "production",
      profile: "main",
      containerUrl: "https://container.example.com",
      consoleUrl: "https://console.example.com",
    });
    expect(mockExecCli).toHaveBeenCalledWith(
      "whoami",
      [],
      {
        mode: "production",
        profile: "main",
        containerUrl: "https://container.example.com",
        consoleUrl: "https://console.example.com",
      },
      NETWORK_TIMEOUT,
      undefined
    );
  });
});
