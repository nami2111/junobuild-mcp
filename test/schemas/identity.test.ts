import { describe, it, expect } from "vitest";
import { versionSchema, runScriptSchema, statusSchema } from "../../src/schemas/identity.js";

describe("versionSchema", () => {
  it("accepts empty object", () => {
    const result = versionSchema.parse({});
    expect(result).toEqual({});
  });

  it("rejects extra keys due to strict", () => {
    expect(() => versionSchema.parse({ extra: true })).toThrow();
  });
});

describe("runScriptSchema", () => {
  it("requires src string", () => {
    const result = runScriptSchema.parse({ src: "script.ts" });
    expect(result.src).toBe("script.ts");
  });

  it("accepts src with mode and profile", () => {
    const result = runScriptSchema.parse({ src: "test.js", mode: "development", profile: "dev" });
    expect(result.src).toBe("test.js");
    expect(result.mode).toBe("development");
  });

  it("rejects missing src", () => {
    expect(() => runScriptSchema.parse({})).toThrow();
  });

  it("rejects extra keys due to strict", () => {
    expect(() => runScriptSchema.parse({ src: "a", extra: 1 })).toThrow();
  });
});

describe("statusSchema", () => {
  it("accepts empty (all optional)", () => {
    const result = statusSchema.parse({});
    expect(result.containerUrl).toBeUndefined();
    expect(result.consoleUrl).toBeUndefined();
  });

  it("accepts containerUrl", () => {
    const result = statusSchema.parse({ containerUrl: "https://example.com" });
    expect(result.containerUrl).toBe("https://example.com");
  });

  it("accepts consoleUrl", () => {
    const result = statusSchema.parse({ consoleUrl: "https://console.example.com" });
    expect(result.consoleUrl).toBe("https://console.example.com");
  });

  it("accepts both urls", () => {
    const result = statusSchema.parse({
      containerUrl: "https://container.example.com",
      consoleUrl: "https://console.example.com"
    });
    expect(result.containerUrl).toBe("https://container.example.com");
    expect(result.consoleUrl).toBe("https://console.example.com");
  });

  it("rejects extra keys due to strict", () => {
    expect(() => statusSchema.parse({ extra: true })).toThrow();
  });
});
