import { describe, expect, it, vi } from "vitest";
import { NETWORK_TIMEOUT } from "../../src/constants.js";
import {
  handleFunctionsBuild,
  handleFunctionsEject,
  handleFunctionsPublish,
  handleFunctionsUpgrade,
} from "../../src/tools/functions.js";

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
    (extra?: { _meta?: { progressToken?: unknown } }) =>
      extra?._meta?.progressToken ? vi.fn() : undefined
  ),
  makeLogCallback: vi.fn((extra?: { sendNotification?: unknown }) =>
    typeof extra?.sendNotification === "function" ? vi.fn() : undefined
  ),
}));

import {
  execCli,
  execWithRetry,
  execWithStreaming,
  formatResponse,
  makeProgressCallback,
} from "../../src/cli.js";

const mockExecCli = vi.mocked(execCli);
const mockExecWithRetry = vi.mocked(execWithRetry);
const mockExecWithStreaming = vi.mocked(execWithStreaming);
const mockFormatResponse = vi.mocked(formatResponse);

describe("handleFunctionsBuild", () => {
  it("calls execCli with functions build", async () => {
    await handleFunctionsBuild({});
    expect(mockExecCli).toHaveBeenCalledWith(
      "functions",
      ["build"],
      undefined,
      NETWORK_TIMEOUT
    );
    expect(mockFormatResponse).toHaveBeenCalledWith(
      { stdout: "ok", stderr: "", exitCode: 0 },
      "Functions Build"
    );
  });

  it("passes lang and watch flags", async () => {
    await handleFunctionsBuild({ lang: "rust", watch: true });
    expect(mockExecCli).toHaveBeenCalledWith(
      "functions",
      ["build", "-l", "rust", "--watch"],
      undefined,
      NETWORK_TIMEOUT
    );
  });
});

describe("handleFunctionsEject", () => {
  it("calls execCli with functions eject", async () => {
    await handleFunctionsEject({});
    expect(mockExecCli).toHaveBeenCalledWith(
      "functions",
      ["eject"],
      undefined,
      NETWORK_TIMEOUT
    );
  });

  it("passes lang flag", async () => {
    await handleFunctionsEject({ lang: "typescript" });
    expect(mockExecCli).toHaveBeenCalledWith(
      "functions",
      ["eject", "-l", "typescript"],
      undefined,
      NETWORK_TIMEOUT
    );
  });
});

describe("handleFunctionsPublish", () => {
  it("calls execCli by default", async () => {
    await handleFunctionsPublish({});
    expect(mockExecCli).toHaveBeenCalledWith(
      "functions",
      ["publish"],
      {},
      NETWORK_TIMEOUT
    );
    expect(mockFormatResponse).toHaveBeenCalledWith(
      { stdout: "ok", stderr: "", exitCode: 0 },
      "Functions Publish"
    );
  });

  it("calls execWithStreaming when progress is true", async () => {
    await handleFunctionsPublish(
      { progress: true, mode: "production" },
      { _meta: { progressToken: "x" } }
    );
    expect(mockExecWithStreaming).toHaveBeenCalledWith(
      "functions",
      ["publish"],
      { mode: "production" },
      NETWORK_TIMEOUT,
      expect.any(Function),
      undefined
    );
    expect(makeProgressCallback).toHaveBeenCalled();
  });

  it("calls execWithRetry when retry is true", async () => {
    await handleFunctionsPublish({ retry: true });
    expect(mockExecWithRetry).toHaveBeenCalledWith(
      "functions",
      ["publish"],
      {},
      NETWORK_TIMEOUT,
      3,
      1000,
      8000
    );
  });

  it("passes src and no-apply flags", async () => {
    await handleFunctionsPublish({
      src: "./out.wasm.gz",
      noApply: true,
      keepStaged: true,
    });
    expect(mockExecCli).toHaveBeenCalledWith(
      "functions",
      ["publish", "-s", "./out.wasm.gz", "--no-apply"],
      {},
      NETWORK_TIMEOUT
    );
  });
});

describe("handleFunctionsUpgrade", () => {
  it("calls execCli by default", async () => {
    await handleFunctionsUpgrade({});
    expect(mockExecCli).toHaveBeenCalledWith(
      "functions",
      ["upgrade"],
      {},
      NETWORK_TIMEOUT
    );
    expect(mockFormatResponse).toHaveBeenCalledWith(
      { stdout: "ok", stderr: "", exitCode: 0 },
      "Functions Upgrade"
    );
  });

  it("calls execWithStreaming when progress is true", async () => {
    await handleFunctionsUpgrade(
      { progress: true },
      { _meta: { progressToken: "x" } }
    );
    expect(mockExecWithStreaming).toHaveBeenCalledWith(
      "functions",
      ["upgrade"],
      {},
      NETWORK_TIMEOUT,
      expect.any(Function),
      undefined
    );
  });

  it("calls execWithRetry when retry is true", async () => {
    await handleFunctionsUpgrade({ retry: true });
    expect(mockExecWithRetry).toHaveBeenCalledWith(
      "functions",
      ["upgrade"],
      {},
      NETWORK_TIMEOUT,
      3,
      1000,
      8000
    );
  });

  it("passes all upgrade flags", async () => {
    await handleFunctionsUpgrade({
      src: "./new.wasm.gz",
      cdn: true,
      cdnPath: "v1/snapshot.wasm.gz",
      clearChunks: true,
      noSnapshot: true,
      reset: true,
    });
    expect(mockExecCli).toHaveBeenCalledWith(
      "functions",
      [
        "upgrade",
        "-s",
        "./new.wasm.gz",
        "--cdn",
        "--cdn-path",
        "v1/snapshot.wasm.gz",
        "--clear-chunks",
        "--no-snapshot",
        "-r",
      ],
      {},
      NETWORK_TIMEOUT
    );
  });
});
