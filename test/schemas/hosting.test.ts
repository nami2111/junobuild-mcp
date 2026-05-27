import { describe, expect, it } from "vitest";
import {
  hostingClearSchema,
  hostingDeploySchema,
  hostingPruneSchema,
} from "../../src/schemas/hosting.js";

describe("hostingDeploySchema", () => {
  it("applies defaults", () => {
    const result = hostingDeploySchema.parse({});
    expect(result.batch).toBe(50);
    expect(result.clear).toBe(false);
    expect(result.prune).toBe(false);
    expect(result.immediate).toBe(false);
    expect(result.keepStaged).toBe(false);
    expect(result.noApply).toBe(false);
    expect(result.config).toBe(false);
    expect(result.retry).toBe(false);
    expect(result.progress).toBe(false);
  });

  it("accepts all flags enabled", () => {
    const result = hostingDeploySchema.parse({
      batch: 10,
      clear: true,
      prune: true,
      immediate: true,
      keepStaged: true,
      noApply: true,
      config: true,
      retry: true,
      progress: true,
    });
    expect(result.batch).toBe(10);
    expect(result.clear).toBe(true);
    expect(result.prune).toBe(true);
    expect(result.immediate).toBe(true);
    expect(result.keepStaged).toBe(true);
    expect(result.noApply).toBe(true);
    expect(result.config).toBe(true);
    expect(result.retry).toBe(true);
    expect(result.progress).toBe(true);
  });

  it("rejects batch below minimum", () => {
    expect(() => hostingDeploySchema.parse({ batch: 0 })).toThrow();
  });

  it("rejects batch above maximum", () => {
    expect(() => hostingDeploySchema.parse({ batch: 201 })).toThrow();
  });

  it("rejects non-integer batch", () => {
    expect(() => hostingDeploySchema.parse({ batch: 10.5 })).toThrow();
  });

  it("rejects extra keys due to strict", () => {
    expect(() => hostingDeploySchema.parse({ unknown: true })).toThrow();
  });
});

describe("hostingClearSchema", () => {
  it("accepts empty (all optional)", () => {
    const result = hostingClearSchema.parse({});
    expect(result.fullPath).toBeUndefined();
  });

  it("accepts fullPath", () => {
    const result = hostingClearSchema.parse({ fullPath: "/index.html" });
    expect(result.fullPath).toBe("/index.html");
  });

  it("rejects extra keys due to strict", () => {
    expect(() => hostingClearSchema.parse({ unknown: true })).toThrow();
  });
});

describe("hostingPruneSchema", () => {
  it("applies defaults", () => {
    const result = hostingPruneSchema.parse({});
    expect(result.batch).toBe(100);
    expect(result.dryRun).toBe(false);
  });

  it("accepts custom values", () => {
    const result = hostingPruneSchema.parse({ batch: 50, dryRun: true });
    expect(result.batch).toBe(50);
    expect(result.dryRun).toBe(true);
  });

  it("rejects batch below minimum", () => {
    expect(() => hostingPruneSchema.parse({ batch: 0 })).toThrow();
  });

  it("rejects batch above maximum", () => {
    expect(() => hostingPruneSchema.parse({ batch: 201 })).toThrow();
  });

  it("rejects extra keys due to strict", () => {
    expect(() => hostingPruneSchema.parse({ unknown: true })).toThrow();
  });
});
