import { describe, it, expect } from "vitest";
import {
  functionsBuildSchema,
  functionsEjectSchema,
  functionsPublishSchema,
  functionsUpgradeSchema
} from "../../src/schemas/functions.js";

describe("functionsBuildSchema", () => {
  it("applies defaults", () => {
    const result = functionsBuildSchema.parse({});
    expect(result.lang).toBeUndefined();
    expect(result.cargoPath).toBeUndefined();
    expect(result.sourcePath).toBeUndefined();
    expect(result.watch).toBe(false);
  });

  it("accepts all fields", () => {
    const result = functionsBuildSchema.parse({
      lang: "rust",
      cargoPath: "./Cargo.toml",
      sourcePath: "./src/lib.rs",
      watch: true
    });
    expect(result.lang).toBe("rust");
    expect(result.cargoPath).toBe("./Cargo.toml");
    expect(result.sourcePath).toBe("./src/lib.rs");
    expect(result.watch).toBe(true);
  });

  it("rejects invalid lang", () => {
    expect(() => functionsBuildSchema.parse({ lang: "python" })).toThrow();
  });

  it("rejects extra keys due to strict", () => {
    expect(() => functionsBuildSchema.parse({ unknown: true })).toThrow();
  });
});

describe("functionsEjectSchema", () => {
  it("accepts empty", () => {
    const result = functionsEjectSchema.parse({});
    expect(result.lang).toBeUndefined();
  });

  it("accepts lang", () => {
    const result = functionsEjectSchema.parse({ lang: "ts" });
    expect(result.lang).toBe("ts");
  });

  it("rejects invalid lang", () => {
    expect(() => functionsEjectSchema.parse({ lang: "swift" })).toThrow();
  });

  it("rejects extra keys due to strict", () => {
    expect(() => functionsEjectSchema.parse({ extra: 1 })).toThrow();
  });
});

describe("functionsPublishSchema", () => {
  it("applies defaults", () => {
    const result = functionsPublishSchema.parse({});
    expect(result.src).toBeUndefined();
    expect(result.noApply).toBe(false);
    expect(result.keepStaged).toBe(false);
    expect(result.retry).toBe(false);
    expect(result.progress).toBe(false);
  });

  it("accepts all fields", () => {
    const result = functionsPublishSchema.parse({
      src: "./out.wasm.gz",
      noApply: true,
      keepStaged: true,
      retry: true,
      progress: true,
      mode: "staging",
      profile: "test",
      containerUrl: "https://container.example.com",
      consoleUrl: "https://console.example.com"
    });
    expect(result.src).toBe("./out.wasm.gz");
    expect(result.noApply).toBe(true);
    expect(result.keepStaged).toBe(true);
    expect(result.retry).toBe(true);
    expect(result.progress).toBe(true);
    expect(result.mode).toBe("staging");
    expect(result.containerUrl).toBe("https://container.example.com");
    expect(result.consoleUrl).toBe("https://console.example.com");
  });

  it("rejects extra keys due to strict", () => {
    expect(() => functionsPublishSchema.parse({ unknown: true })).toThrow();
  });
});

describe("functionsUpgradeSchema", () => {
  it("applies defaults", () => {
    const result = functionsUpgradeSchema.parse({});
    expect(result.src).toBeUndefined();
    expect(result.cdn).toBe(false);
    expect(result.cdnPath).toBeUndefined();
    expect(result.clearChunks).toBe(false);
    expect(result.noSnapshot).toBe(false);
    expect(result.reset).toBe(false);
    expect(result.retry).toBe(false);
    expect(result.progress).toBe(false);
  });

  it("accepts all fields", () => {
    const result = functionsUpgradeSchema.parse({
      src: "./new.wasm.gz",
      cdn: true,
      cdnPath: "v1.2.3/snapshot.wasm.gz",
      clearChunks: true,
      noSnapshot: true,
      reset: true,
      retry: true,
      progress: true,
      mode: "production"
    });
    expect(result.src).toBe("./new.wasm.gz");
    expect(result.cdn).toBe(true);
    expect(result.cdnPath).toBe("v1.2.3/snapshot.wasm.gz");
    expect(result.clearChunks).toBe(true);
    expect(result.noSnapshot).toBe(true);
    expect(result.reset).toBe(true);
    expect(result.retry).toBe(true);
    expect(result.progress).toBe(true);
  });

  it("rejects extra keys due to strict", () => {
    expect(() => functionsUpgradeSchema.parse({ extra: true })).toThrow();
  });
});
