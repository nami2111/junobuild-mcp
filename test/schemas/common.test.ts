import { describe, expect, it } from "vitest";
import {
  environmentFlagsBase,
  globalFlagsBase,
} from "../../src/schemas/common.js";

describe("globalFlagsBase", () => {
  it("accepts empty object (all optional)", () => {
    const result = globalFlagsBase.parse({});
    expect(result.mode).toBeUndefined();
    expect(result.profile).toBeUndefined();
  });

  it("accepts mode production", () => {
    const result = globalFlagsBase.parse({ mode: "production" });
    expect(result.mode).toBe("production");
  });

  it("accepts mode staging", () => {
    const result = globalFlagsBase.parse({ mode: "staging" });
    expect(result.mode).toBe("staging");
  });

  it("accepts mode development", () => {
    const result = globalFlagsBase.parse({ mode: "development" });
    expect(result.mode).toBe("development");
  });

  it("rejects invalid mode value", () => {
    expect(() => globalFlagsBase.parse({ mode: "invalid" })).toThrow();
  });

  it("accepts profile string", () => {
    const result = globalFlagsBase.parse({ profile: "my-profile" });
    expect(result.profile).toBe("my-profile");
  });

  it("rejects extra keys due to strict", () => {
    expect(() => globalFlagsBase.parse({ unknown: "key" })).toThrow();
  });

  it("accepts both mode and profile", () => {
    const result = globalFlagsBase.parse({
      mode: "production",
      profile: "main",
    });
    expect(result.mode).toBe("production");
    expect(result.profile).toBe("main");
  });
});

describe("environmentFlagsBase", () => {
  it("accepts full Juno environment context", () => {
    const result = environmentFlagsBase.parse({
      mode: "development",
      profile: "dev",
      containerUrl: "https://container.example.com",
      consoleUrl: "https://console.example.com",
    });

    expect(result.mode).toBe("development");
    expect(result.profile).toBe("dev");
    expect(result.containerUrl).toBe("https://container.example.com");
    expect(result.consoleUrl).toBe("https://console.example.com");
  });

  it("rejects extra keys due to strict", () => {
    expect(() => environmentFlagsBase.parse({ unknown: "key" })).toThrow();
  });
});
