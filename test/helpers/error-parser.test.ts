import { describe, expect, it } from "vitest";
import { parseCliError } from "../../src/error-parser.js";

describe("parseCliError", () => {
  it("returns null for successful exit code", () => {
    const result = parseCliError("", "", 0);
    expect(result).toBeNull();
  });

  it("detects authentication errors", () => {
    const result = parseCliError("Error: Not authenticated", "", 1);
    expect(result).toEqual({
      type: "auth",
      message: "Not authenticated",
      suggestion: "Run `juno login` or set JUNO_TOKEN environment variable.",
    });
  });

  it("detects satellite not found errors", () => {
    const result = parseCliError("Satellite not found: abc-123", "", 1);
    expect(result).toEqual({
      type: "not_found",
      message: "Satellite not found: abc-123",
      suggestion:
        "Check satellite ID in juno.config or use --mode/--profile flags.",
    });
  });

  it("detects config missing errors", () => {
    const result = parseCliError("juno.config.ts not found", "", 1);
    expect(result).toEqual({
      type: "config",
      message: "juno.config.ts not found",
      suggestion:
        "Run `juno config init` to create juno.config.ts in project root.",
    });
  });

  it("detects network errors", () => {
    const result = parseCliError("Network error: ETIMEDOUT", "", 1);
    expect(result).toEqual({
      type: "network",
      message: "Network error: ETIMEDOUT",
      suggestion: "Check network connection. Retry with --retry flag.",
    });
  });

  it("detects rate limit errors", () => {
    const result = parseCliError("HTTP 429: Too many requests", "", 1);
    expect(result).toEqual({
      type: "network",
      message: "HTTP 429: Too many requests",
      suggestion: "Rate limited. Wait before retrying.",
    });
  });

  it("detects permission errors", () => {
    const result = parseCliError("Permission denied", "", 1);
    expect(result).toEqual({
      type: "permission",
      message: "Permission denied",
      suggestion: "Verify you have required permissions for this satellite.",
    });
  });

  it("returns null for unknown errors", () => {
    const result = parseCliError("Some random error", "", 1);
    expect(result).toBeNull();
  });

  it("extracts error message from stderr", () => {
    const stderr = `
Error: Authentication failed
    at someFunction (file.js:10)
    at anotherFunction (file.js:20)
`;
    const result = parseCliError(stderr, "", 1);
    expect(result?.message).toBe("Authentication failed");
  });

  it("falls back to stdout if stderr empty", () => {
    const result = parseCliError("", "Invalid token provided", 1);
    expect(result?.type).toBe("auth");
    expect(result?.message).toBe("Invalid token provided");
  });

  it("handles case-insensitive matching", () => {
    const result = parseCliError("AUTHENTICATION FAILED", "", 1);
    expect(result?.type).toBe("auth");
  });
});
