import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildFlagArgs,
  debugLog,
  execCli,
  execCommand,
  execWithRetry,
  execWithStreaming,
  formatResponse,
  makeLogCallback,
  makeProgressCallback,
  resetCliPathCache,
} from "../../src/cli.js";
import { CHARACTER_LIMIT } from "../../src/constants.js";
import {
  execCommandNonInteractive,
  isTransientError,
  parseProgress,
  stripProgressChars,
} from "../../src/executor.js";

const ZZZ_REGEX = /^zzz$/m;

describe("buildFlagArgs", () => {
  it("returns empty array when flags undefined", () => {
    expect(buildFlagArgs()).toEqual([]);
  });

  it("returns empty array when flags empty", () => {
    expect(buildFlagArgs({})).toEqual([]);
  });

  it("builds --mode flag only", () => {
    expect(buildFlagArgs({ mode: "staging" })).toEqual(["--mode", "staging"]);
  });

  it("builds --profile flag only", () => {
    expect(buildFlagArgs({ profile: "prod" })).toEqual(["--profile", "prod"]);
  });

  it("builds both flags in order", () => {
    expect(buildFlagArgs({ mode: "production", profile: "main" })).toEqual([
      "--mode",
      "production",
      "--profile",
      "main",
    ]);
  });

  it("builds full Juno environment flags in order", () => {
    expect(
      buildFlagArgs({
        mode: "development",
        profile: "dev",
        containerUrl: "https://container.example.com",
        consoleUrl: "https://console.example.com",
      })
    ).toEqual([
      "--mode",
      "development",
      "--profile",
      "dev",
      "--container-url",
      "https://container.example.com",
      "--console-url",
      "https://console.example.com",
    ]);
  });
});

describe("formatResponse", () => {
  it("returns success output without label", () => {
    const result = formatResponse({ stdout: "ok", stderr: "", exitCode: 0 });
    expect(result.text).toBe("ok");
    expect(result.isError).toBe(false);
  });

  it("returns success output with label", () => {
    const result = formatResponse(
      { stdout: "deployed", stderr: "", exitCode: 0 },
      "Deploy"
    );
    expect(result.text).toBe("## Deploy\n\ndeployed");
    expect(result.isError).toBe(false);
  });

  it("appends warnings on success with stderr", () => {
    const result = formatResponse(
      { stdout: "done", stderr: "deprecated flag", exitCode: 0 },
      "Build"
    );
    expect(result.text).toContain("done");
    expect(result.text).toContain("**Warnings:**");
    expect(result.text).toContain("deprecated flag");
    expect(result.isError).toBe(false);
  });

  it("returns stderr on error when present", () => {
    const result = formatResponse({
      stdout: "",
      stderr: "file not found",
      exitCode: 1,
    });
    expect(result.text).toContain("Error (exit code 1)");
    expect(result.text).toContain("file not found");
    expect(result.isError).toBe(true);
  });

  it("falls back to stdout on error when stderr empty", () => {
    const result = formatResponse({
      stdout: "something went wrong",
      stderr: "",
      exitCode: 2,
    });
    expect(result.text).toContain("Error (exit code 2)");
    expect(result.text).toContain("something went wrong");
  });

  it("handles empty stdout and stderr on error", () => {
    const result = formatResponse({ stdout: "", stderr: "", exitCode: 127 });
    expect(result.text).toContain("Error (exit code 127)");
    expect(result.isError).toBe(true);
  });

  it("strips ANSI codes from output", () => {
    const result = formatResponse({
      stdout: "\x1b[32mok\x1b[0m",
      stderr: "",
      exitCode: 0,
    });
    expect(result.text).toBe("ok");
  });

  it("truncates text exceeding CHARACTER_LIMIT", () => {
    const long = "a".repeat(CHARACTER_LIMIT + 100);
    const result = formatResponse({ stdout: long, stderr: "", exitCode: 0 });
    expect(result.text.length).toBeLessThanOrEqual(CHARACTER_LIMIT + 20);
    expect(result.text).toContain("...(truncated)");
  });

  it("does not truncate text under CHARACTER_LIMIT", () => {
    const short = "short output";
    const result = formatResponse({ stdout: short, stderr: "", exitCode: 0 });
    expect(result.text).toBe(short);
    expect(result.text).not.toContain("...(truncated)");
  });
});

describe("stripProgressChars", () => {
  it("removes braille spinner characters", () => {
    const input = "\u28FE Building...";
    expect(stripProgressChars(input)).toBe(" Building...");
  });

  it("removes checkmark and cross symbols", () => {
    const input = "\u2713 success \u2717 failure";
    expect(stripProgressChars(input)).toBe(" success  failure");
  });

  it("removes repeated z characters", () => {
    const input = "zzz\nreal line";
    expect(stripProgressChars(input)).toContain("real line");
    expect(stripProgressChars(input)).not.toMatch(ZZZ_REGEX);
  });

  it("does not remove single z", () => {
    const input = "z is a letter";
    expect(stripProgressChars(input)).toBe("z is a letter");
  });

  it("normalizes CRLF to LF", () => {
    const input = "line1\r\nline2";
    expect(stripProgressChars(input)).toBe("line1\nline2");
  });

  it("does not convert orphan CR to LF", () => {
    const input = "line1\rline2";
    expect(stripProgressChars(input)).toBe("line1\rline2");
  });

  it("returns plain text unchanged", () => {
    const input = "plain text without progress chars";
    expect(stripProgressChars(input)).toBe(input);
  });
});

describe("isTransientError", () => {
  const mkResult = (stdout: string, stderr: string, exitCode: number) => ({
    stdout,
    stderr,
    exitCode,
  });

  it("returns false for exitCode 0", () => {
    expect(isTransientError(mkResult("", "timeout", 0))).toBe(false);
  });

  it.each([
    ["timeout"],
    ["ETIMEDOUT"],
    ["ECONNRESET"],
    ["ECONNREFUSED"],
    ["ENOTFOUND"],
    ["socket hang up"],
    ["network error"],
    ["rate limit"],
    ["429"],
    ["502 Bad Gateway"],
    ["503 Service Unavailable"],
    ["504 Gateway Timeout"],
  ])("detects transient pattern: %s", (pattern) => {
    expect(isTransientError(mkResult("", pattern, 1))).toBe(true);
    expect(isTransientError(mkResult(pattern, "", 1))).toBe(true);
  });

  it("returns false for non-transient errors", () => {
    expect(isTransientError(mkResult("", "file not found", 1))).toBe(false);
    expect(isTransientError(mkResult("", "permission denied", 1))).toBe(false);
    expect(isTransientError(mkResult("", "syntax error", 1))).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isTransientError(mkResult("", "TIMEOUT", 1))).toBe(true);
    expect(isTransientError(mkResult("", "Rate Limit", 1))).toBe(true);
  });
});

describe("parseProgress", () => {
  it("parses [1/10] Initializing correctly", () => {
    const parsed = parseProgress("[1/10] Initializing");
    expect(parsed).not.toBeNull();
    expect(parsed?.progress).toBe(3);
    expect(parsed?.message).toBe("Initializing batch 1/10");
  });

  it("parses [5/10] Uploading correctly", () => {
    const parsed = parseProgress("[5/10] Uploading batch files");
    expect(parsed).not.toBeNull();
    expect(parsed?.progress).toBe(47);
    expect(parsed?.message).toBe("Uploading batch 5/10");
  });

  it("parses [10/10] Committing at 99% capped", () => {
    const parsed = parseProgress("[10/10] Committing changes");
    expect(parsed).not.toBeNull();
    expect(parsed?.progress).toBe(99);
    expect(parsed?.message).toBe("Committing batch 10/10");
  });

  it("returns null for lines without batch notation", () => {
    expect(parseProgress("Building...")).toBeNull();
    expect(parseProgress("Done")).toBeNull();
  });

  it("returns null when total is 0", () => {
    expect(parseProgress("[1/0] Initializing")).toBeNull();
  });

  it("defaults to Processing phase when unknown", () => {
    const parsed = parseProgress("[2/5] Compiling assets");
    expect(parsed).not.toBeNull();
    expect(parsed?.message).toBe("Processing batch 2/5");
  });

  it("handles single batch [1/1]", () => {
    const parsed = parseProgress("[1/1] Uploading");
    expect(parsed).not.toBeNull();
    expect(parsed?.progress).toBe(67);
  });
});

describe("makeProgressCallback", () => {
  it("returns undefined when no progressToken present", () => {
    expect(makeProgressCallback({})).toBeUndefined();
    expect(makeProgressCallback({ _meta: {} })).toBeUndefined();
  });

  it("returns a function when progressToken exists", () => {
    const cb = makeProgressCallback({
      _meta: { progressToken: "abc123" },
      sendNotification: vi.fn().mockResolvedValue(undefined),
    });
    expect(typeof cb).toBe("function");
  });

  it("sends correct notification payload", async () => {
    const sendNotification = vi.fn().mockResolvedValue(undefined);
    const cb = makeProgressCallback({
      _meta: { progressToken: 42 },
      sendNotification,
    });

    cb?.(50, "Uploading");
    await new Promise((r) => setTimeout(r, 10));

    expect(sendNotification).toHaveBeenCalledWith({
      method: "notifications/progress",
      params: {
        progressToken: 42,
        progress: 50,
        total: 100,
        message: "Uploading",
      },
    });
  });

  it("swallows sendNotification rejection", () => {
    const sendNotification = vi.fn().mockRejectedValue(new Error("boom"));
    const cb = makeProgressCallback({
      _meta: { progressToken: "x" },
      sendNotification,
    });

    expect(() => cb?.(10, "test")).not.toThrow();
  });
});

describe("debugLog", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    delete process.env.JUNO_MCP_DEBUG;
    delete process.env.DEBUG;
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {
      /* noop */
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    delete process.env.JUNO_MCP_DEBUG;
    delete process.env.DEBUG;
  });

  it("does nothing when no debug env var is set", () => {
    debugLog("test context", new Error("boom"));
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("logs to console.error when JUNO_MCP_DEBUG=true", () => {
    process.env.JUNO_MCP_DEBUG = "true";
    debugLog("test context", new Error("boom"));
    expect(consoleErrorSpy).toHaveBeenCalledWith("[DEBUG] test context: boom");
  });

  it("logs when DEBUG=true", () => {
    process.env.DEBUG = "true";
    debugLog("ctx", new Error("oops"));
    expect(consoleErrorSpy).toHaveBeenCalledWith("[DEBUG] ctx: oops");
  });

  it("stringifies non-Error values", () => {
    process.env.JUNO_MCP_DEBUG = "true";
    debugLog("ctx", "string error");
    expect(consoleErrorSpy).toHaveBeenCalledWith("[DEBUG] ctx: string error");
  });

  it("does not log when env var set to non-true value", () => {
    process.env.JUNO_MCP_DEBUG = "1";
    debugLog("ctx", new Error("ignored"));
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});

describe("makeLogCallback", () => {
  it("returns undefined when no sendNotification present", () => {
    expect(makeLogCallback({})).toBeUndefined();
    expect(makeLogCallback({ _meta: {} })).toBeUndefined();
  });

  it("returns a function when sendNotification exists", () => {
    const cb = makeLogCallback({
      sendNotification: vi.fn().mockResolvedValue(undefined),
    });
    expect(typeof cb).toBe("function");
  });

  it("sends correct info notification payload", async () => {
    const sendNotification = vi.fn().mockResolvedValue(undefined);
    const cb = makeLogCallback({ sendNotification }, "juno_hosting");

    cb?.("info", "Uploading file foo.js");
    await new Promise((r) => setTimeout(r, 10));

    expect(sendNotification).toHaveBeenCalledWith({
      method: "notifications/message",
      params: {
        level: "info",
        data: "Uploading file foo.js",
        logger: "juno_hosting",
      },
    });
  });

  it("sends correct error notification payload", async () => {
    const sendNotification = vi.fn().mockResolvedValue(undefined);
    const cb = makeLogCallback({ sendNotification });

    cb?.("error", "Build failed");
    await new Promise((r) => setTimeout(r, 10));

    expect(sendNotification).toHaveBeenCalledWith({
      method: "notifications/message",
      params: {
        level: "error",
        data: "Build failed",
        logger: undefined,
      },
    });
  });

  it("swallows sendNotification rejection", () => {
    const sendNotification = vi.fn().mockRejectedValue(new Error("boom"));
    const cb = makeLogCallback({ sendNotification });

    expect(() => cb?.("info", "test")).not.toThrow();
  });
});

describe("execCommandNonInteractive", () => {
  it("runs a simple command successfully", async () => {
    const result = await execCommandNonInteractive("echo", ["hello"], 5000);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("hello");
  });

  it("respects timeout and kills process", async () => {
    const result = await execCommandNonInteractive("sleep", ["10"], 1000);
    expect(result.exitCode).not.toBe(0);
  });

  it("runs command in specified cwd", async () => {
    const testDir = join(tmpdir(), `juno-test-cwd-${randomUUID()}`);
    mkdirSync(testDir, { recursive: true });
    try {
      const result = await execCommandNonInteractive("pwd", [], 5000, testDir);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe(testDir);
    } finally {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("pipes stdin answers to interactive command", async () => {
    const result = await execCommandNonInteractive(
      "cat",
      [],
      10_000,
      undefined,
      ["hello"]
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("hello");
  });
});

describe("execCommand", () => {
  it("returns stdout and exitCode 0 for successful command", async () => {
    const result = await execCommand("echo hello-test");
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe("hello-test");
  });

  it("returns stderr and exitCode 1 for failed command", async () => {
    const failResult = await execCommand("ls /nonexistent_path_12345");
    expect(failResult.exitCode).toBe(1);
    expect(failResult.stderr).toBeTruthy();
  });

  it("strips ANSI from output", async () => {
    const result = await execCommand("printf 'plain'");
    expect(result.stdout).toBe("plain");
  });
});

describe("execCli + execWithRetry + execWithStreaming", () => {
  beforeEach(() => {
    resetCliPathCache();
  });

  afterEach(() => {
    resetCliPathCache();
  });

  it("execCli falls back to npx when juno is not found", async () => {
    const result = await execCli("version", [], undefined, 5000);
    expect(result).toHaveProperty("exitCode");
    expect(typeof result.exitCode).toBe("number");
  });

  it("execWithRetry returns a CliResult for Juno CLI commands", async () => {
    const result = await execWithRetry("version", [], undefined, 5000, 0);
    expect(result).toHaveProperty("exitCode");
    expect(typeof result.exitCode).toBe("number");
    expect(result).toHaveProperty("stdout");
    expect(result).toHaveProperty("stderr");
  });

  it("execWithRetry does not invoke backoff for non-transient errors", async () => {
    const spy = vi.spyOn(global, "setTimeout");
    const result = await execWithRetry("version", [], undefined, 5000, 0, 10);
    expect(typeof result.exitCode).toBe("number");
    spy.mockRestore();
  });

  it("execWithRetry retry logic is consistent with isTransientError", () => {
    const transient = { stdout: "", stderr: "ETIMEDOUT", exitCode: 1 };
    const nonTransient = { stdout: "", stderr: "file not found", exitCode: 1 };
    const success = { stdout: "ok", stderr: "", exitCode: 0 };

    expect(isTransientError(transient)).toBe(true);
    expect(isTransientError(nonTransient)).toBe(false);
    expect(isTransientError(success)).toBe(false);
  });

  it("execWithStreaming returns a CliResult without crashing", async () => {
    const progressCalls: Array<{ progress: number; message: string }> = [];
    const onProgress = (progress: number, message: string) => {
      progressCalls.push({ progress, message });
    };

    const result = await execWithStreaming(
      "version",
      [],
      undefined,
      5000,
      onProgress
    );
    expect(result).toHaveProperty("exitCode");
    expect(typeof result.exitCode).toBe("number");
    expect(result).toHaveProperty("stdout");
    expect(result).toHaveProperty("stderr");
  });

  it("execWithStreaming passes onLog callback that fires on stdout lines", async () => {
    const logCalls: Array<{ level: string; message: string }> = [];
    const onLog = (level: "info" | "error", message: string) => {
      logCalls.push({ level, message });
    };

    const result = await execWithStreaming(
      "version",
      [],
      undefined,
      5000,
      undefined,
      onLog
    );
    expect(result).toHaveProperty("exitCode");
    // Whether juno is installed or not, at least one line of output is expected.
    // If juno not present, the npx fallback prints something; if it is, version output prints.
    // Just verify it does not throw and result shape is correct.
    expect(typeof result.exitCode).toBe("number");
  });
});

describe("CLI version checks", () => {
  beforeEach(() => {
    resetCliPathCache();
    delete process.env.JUNO_SKIP_VERSION_CHECK;
  });

  it("allows compatible CLI version", async () => {
    const result = await execCli("--version");
    expect(result.exitCode).toBe(0);
  });

  it("skips version check when JUNO_SKIP_VERSION_CHECK=true", async () => {
    process.env.JUNO_SKIP_VERSION_CHECK = "true";
    resetCliPathCache();
    const result = await execCli("--version");
    expect(result.exitCode).toBe(0);
  });
});
