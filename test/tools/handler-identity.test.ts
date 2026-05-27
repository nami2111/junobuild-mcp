import { describe, it, expect, vi } from "vitest";
import { handleVersion, handleRunScript, handleStatus } from "../../src/tools/identity.js";
import { NETWORK_TIMEOUT } from "../../src/constants.js";

vi.mock("../../src/cli.js", () => ({
  execCli: vi.fn().mockResolvedValue({ stdout: "ok", stderr: "", exitCode: 0 }),
  formatResponse: vi.fn().mockReturnValue({ text: "ok", isError: false })
}));

import { execCli, formatResponse } from "../../src/cli.js";
const mockExecCli = vi.mocked(execCli);
const mockFormatResponse = vi.mocked(formatResponse);

describe("handleVersion", () => {
  it("calls execCli with version command", async () => {
    const result = await handleVersion({});
    expect(mockExecCli).toHaveBeenCalledWith("version", [], undefined, NETWORK_TIMEOUT);
    expect(mockFormatResponse).toHaveBeenCalledWith(
      { stdout: "ok", stderr: "", exitCode: 0 },
      "Version"
    );
    expect(result).toEqual({ content: [{ type: "text", text: "ok" }], isError: false });
  });
});

describe("handleRunScript", () => {
  it("calls execCli with run and -s flag", async () => {
    await handleRunScript({ src: "deploy.ts" });
    expect(mockExecCli).toHaveBeenCalledWith(
      "run",
      ["-s", "deploy.ts"],
      {},
      NETWORK_TIMEOUT
    );
  });

  it("passes mode and profile", async () => {
    await handleRunScript({ src: "test.js", mode: "development", profile: "dev" });
    expect(mockExecCli).toHaveBeenCalledWith(
      "run",
      ["-s", "test.js"],
      { mode: "development", profile: "dev" },
      NETWORK_TIMEOUT
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
      NETWORK_TIMEOUT
    );
  });

  it("passes container-url and console-url", async () => {
    await handleStatus({
      containerUrl: "https://container.example.com",
      consoleUrl: "https://console.example.com"
    });
    expect(mockExecCli).toHaveBeenCalledWith(
      "status",
      [],
      {
        containerUrl: "https://container.example.com",
        consoleUrl: "https://console.example.com"
      },
      NETWORK_TIMEOUT
    );
  });
});
