import type { ServerContext } from "@modelcontextprotocol/server";
import { describe, expect, it, vi } from "vitest";
import { NETWORK_TIMEOUT } from "../../src/constants.js";
import {
  handleHostingClear,
  handleHostingDeploy,
  handleHostingPrune,
} from "../../src/tools/hosting.js";

vi.mock("../../src/cli.js", () => ({
  execCli: vi.fn().mockResolvedValue({ stdout: "ok", stderr: "", exitCode: 0 }),
  execWithRetry: vi
    .fn()
    .mockResolvedValue({ stdout: "retry ok", stderr: "", exitCode: 0 }),
  execWithStreaming: vi
    .fn()
    .mockResolvedValue({ stdout: "stream ok", stderr: "", exitCode: 0 }),
  formatResponse: vi.fn().mockReturnValue({ text: "ok", isError: false }),
  makeProgressCallback: vi.fn(
    (ctx?: { mcpReq?: { _meta?: { progressToken?: unknown } } }) =>
      ctx?.mcpReq?._meta?.progressToken ? vi.fn() : undefined
  ),
  makeLogCallback: vi.fn(() => vi.fn()),
  makeTraceLogger: vi.fn().mockReturnValue(undefined),
}));

import {
  execCli,
  execWithRetry,
  execWithStreaming,
  formatResponse,
  makeLogCallback,
  makeProgressCallback,
} from "../../src/cli.js";

const mockExecCli = vi.mocked(execCli);
const mockExecWithRetry = vi.mocked(execWithRetry);
const mockExecWithStreaming = vi.mocked(execWithStreaming);
const mockFormatResponse = vi.mocked(formatResponse);

describe("handleHostingDeploy", () => {
  it("calls execCli by default", async () => {
    await handleHostingDeploy({ batch: 50 });
    expect(mockExecCli).toHaveBeenCalledWith(
      "hosting",
      ["deploy", "--batch", "50"],
      {},
      NETWORK_TIMEOUT,
      undefined
    );
    expect(mockFormatResponse).toHaveBeenCalledWith(
      { stdout: "ok", stderr: "", exitCode: 0 },
      "Hosting Deploy"
    );
  });

  it("calls execWithStreaming when progress is true", async () => {
    await handleHostingDeploy({ batch: 50, progress: true }, {
      mcpReq: { _meta: { progressToken: "x" } },
    } as unknown as ServerContext);
    expect(mockExecWithStreaming).toHaveBeenCalledWith(
      "hosting",
      ["deploy", "--batch", "50"],
      {},
      NETWORK_TIMEOUT,
      expect.any(Function),
      undefined,
      undefined
    );
    expect(makeProgressCallback).toHaveBeenCalled();
  });

  it("calls execWithRetry when retry is true", async () => {
    await handleHostingDeploy({ batch: 50, retry: true });
    expect(mockExecWithRetry).toHaveBeenCalledWith(
      "hosting",
      ["deploy", "--batch", "50"],
      {},
      NETWORK_TIMEOUT,
      3,
      1000,
      8000,
      undefined
    );
  });

  it("calls execWithStreaming with onLog when streamLogs is true", async () => {
    await handleHostingDeploy({ batch: 50, streamLogs: true }, {
      mcpReq: {},
    } as unknown as ServerContext);
    expect(mockExecWithStreaming).toHaveBeenCalledWith(
      "hosting",
      ["deploy", "--batch", "50"],
      {},
      NETWORK_TIMEOUT,
      undefined,
      expect.any(Function),
      undefined
    );
    expect(makeLogCallback).toHaveBeenCalled();
  });

  it("calls execWithStreaming with both onProgress and onLog when both flags set", async () => {
    await handleHostingDeploy({ batch: 50, progress: true, streamLogs: true }, {
      mcpReq: { _meta: { progressToken: "x" } },
    } as unknown as ServerContext);
    expect(mockExecWithStreaming).toHaveBeenCalledWith(
      "hosting",
      ["deploy", "--batch", "50"],
      {},
      NETWORK_TIMEOUT,
      expect.any(Function),
      expect.any(Function),
      undefined
    );
  });

  it("passes all flags", async () => {
    await handleHostingDeploy({
      batch: 10,
      clear: true,
      prune: true,
      immediate: true,
      keepStaged: true,
      noApply: true,
      config: true,
    });
    expect(mockExecCli).toHaveBeenCalledWith(
      "hosting",
      [
        "deploy",
        "--batch",
        "10",
        "--clear",
        "--prune",
        "-i",
        "--no-apply",
        "--config",
      ],
      {},
      NETWORK_TIMEOUT,
      undefined
    );
  });

  it("passes Juno environment context flags", async () => {
    await handleHostingDeploy({
      batch: 50,
      mode: "production",
      profile: "main",
      containerUrl: "https://container.example.com",
      consoleUrl: "https://console.example.com",
    });
    expect(mockExecCli).toHaveBeenCalledWith(
      "hosting",
      ["deploy", "--batch", "50"],
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

describe("handleHostingClear", () => {
  it("calls execCli with hosting clear", async () => {
    await handleHostingClear({ fullPath: "/index.html" });
    expect(mockExecCli).toHaveBeenCalledWith(
      "hosting",
      ["clear", "-f", "/index.html"],
      {},
      NETWORK_TIMEOUT,
      undefined
    );
  });

  it("works without fullPath", async () => {
    await handleHostingClear({});
    expect(mockExecCli).toHaveBeenCalledWith(
      "hosting",
      ["clear"],
      {},
      NETWORK_TIMEOUT,
      undefined
    );
  });
});

describe("handleHostingPrune", () => {
  it("calls execCli with hosting prune", async () => {
    await handleHostingPrune({ batch: 100 });
    expect(mockExecCli).toHaveBeenCalledWith(
      "hosting",
      ["prune", "--batch", "100"],
      {},
      NETWORK_TIMEOUT,
      undefined
    );
  });

  it("passes dry-run flag", async () => {
    await handleHostingPrune({ batch: 50, dryRun: true });
    expect(mockExecCli).toHaveBeenCalledWith(
      "hosting",
      ["prune", "--batch", "50", "--dry-run"],
      {},
      NETWORK_TIMEOUT,
      undefined
    );
  });
});
