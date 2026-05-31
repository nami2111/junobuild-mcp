import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CHARACTER_LIMIT,
  CLI_PACKAGE,
  DEFAULT_TIMEOUT,
  NETWORK_TIMEOUT,
  parseEnvNumber,
} from "../../src/constants.js";

describe("constants", () => {
  it("CHARACTER_LIMIT is 25000", () => {
    expect(CHARACTER_LIMIT).toBe(25_000);
  });

  it("DEFAULT_TIMEOUT is 120000", () => {
    expect(DEFAULT_TIMEOUT).toBe(120_000);
  });

  it("NETWORK_TIMEOUT is 300000", () => {
    expect(NETWORK_TIMEOUT).toBe(300_000);
  });

  it("CLI_PACKAGE is @junobuild/cli", () => {
    expect(CLI_PACKAGE).toBe("@junobuild/cli");
  });
});

describe("parseEnvNumber", () => {
  const VAR = "JUNO_MCP_TEST_NUMBER";

  beforeEach(() => {
    delete process.env[VAR];
  });

  afterEach(() => {
    delete process.env[VAR];
  });

  it("returns fallback when env var unset", () => {
    expect(parseEnvNumber(VAR, 42)).toBe(42);
  });

  it("returns fallback when env var empty string", () => {
    process.env[VAR] = "";
    expect(parseEnvNumber(VAR, 42)).toBe(42);
  });

  it("parses valid positive integer", () => {
    process.env[VAR] = "1000";
    expect(parseEnvNumber(VAR, 42)).toBe(1000);
  });

  it("returns fallback for non-numeric string", () => {
    process.env[VAR] = "not-a-number";
    expect(parseEnvNumber(VAR, 42)).toBe(42);
  });

  it("returns fallback for zero", () => {
    process.env[VAR] = "0";
    expect(parseEnvNumber(VAR, 42)).toBe(42);
  });

  it("returns fallback for negative number", () => {
    process.env[VAR] = "-100";
    expect(parseEnvNumber(VAR, 42)).toBe(42);
  });

  it("parses leading integer portion", () => {
    process.env[VAR] = "500abc";
    expect(parseEnvNumber(VAR, 42)).toBe(500);
  });
});
