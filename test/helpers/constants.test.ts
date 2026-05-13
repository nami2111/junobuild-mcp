import { describe, it, expect } from "vitest";
import { CHARACTER_LIMIT, DEFAULT_TIMEOUT, NETWORK_TIMEOUT, CLI_PACKAGE } from "../../src/constants.js";

describe("constants", () => {
  it("CHARACTER_LIMIT is 25000", () => {
    expect(CHARACTER_LIMIT).toBe(25000);
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
