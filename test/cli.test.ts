import { describe, it, expect } from "vitest";
import { execCommandNonInteractive } from "../src/cli.js";
import { rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

describe("execCommandNonInteractive", () => {
  it("runs a simple command successfully", async () => {
    const result = await execCommandNonInteractive("echo hello", 5_000);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("hello");
  });

  it("respects timeout and kills process", async () => {
    const result = await execCommandNonInteractive("sleep 10", 1_000);
    expect(result.exitCode).not.toBe(0);
  });

  it("runs command in specified cwd", async () => {
    const testDir = join(tmpdir(), `juno-test-cwd-${randomUUID()}`);
    mkdirSync(testDir, { recursive: true });
    try {
      const result = await execCommandNonInteractive("pwd", 5_000, testDir);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe(testDir);
    } finally {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("pipes stdin answers to interactive command", async () => {
    const result = await execCommandNonInteractive("cat", 10_000, undefined, ["hello"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("hello");
  });
});
