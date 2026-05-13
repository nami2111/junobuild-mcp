import { describe, it, expect } from "vitest";
import { changesListSchema, changesApplySchema, changesRejectSchema } from "../../src/schemas/changes.js";

describe("changesListSchema", () => {
  it("accepts empty (all defaults)", () => {
    const result = changesListSchema.parse({});
    expect(result.all).toBe(false);
    expect(result.every).toBe(false);
  });

  it("accepts all flag", () => {
    const result = changesListSchema.parse({ all: true });
    expect(result.all).toBe(true);
    expect(result.every).toBe(false);
  });

  it("accepts every flag", () => {
    const result = changesListSchema.parse({ every: true });
    expect(result.every).toBe(true);
  });

  it("accepts both flags", () => {
    const result = changesListSchema.parse({ all: true, every: true });
    expect(result.all).toBe(true);
    expect(result.every).toBe(true);
  });

  it("rejects extra keys due to strict", () => {
    expect(() => changesListSchema.parse({ unknown: true })).toThrow();
  });
});

describe("changesApplySchema", () => {
  it("requires id", () => {
    const result = changesApplySchema.parse({ id: "abc-123" });
    expect(result.id).toBe("abc-123");
    expect(result.snapshot).toBe(false);
    expect(result.keepStaged).toBe(false);
  });

  it("accepts all optional fields", () => {
    const result = changesApplySchema.parse({
      id: "abc",
      snapshot: true,
      hash: "0x123",
      keepStaged: true,
      mode: "production",
      profile: "main"
    });
    expect(result.id).toBe("abc");
    expect(result.snapshot).toBe(true);
    expect(result.hash).toBe("0x123");
    expect(result.keepStaged).toBe(true);
  });

  it("rejects missing id", () => {
    expect(() => changesApplySchema.parse({})).toThrow();
  });

  it("rejects extra keys due to strict", () => {
    expect(() => changesApplySchema.parse({ id: "a", extra: 1 })).toThrow();
  });
});

describe("changesRejectSchema", () => {
  it("requires id", () => {
    const result = changesRejectSchema.parse({ id: "abc-123" });
    expect(result.id).toBe("abc-123");
    expect(result.keepStaged).toBe(false);
  });

  it("accepts hash and keepStaged", () => {
    const result = changesRejectSchema.parse({
      id: "abc",
      hash: "0x456",
      keepStaged: true
    });
    expect(result.hash).toBe("0x456");
    expect(result.keepStaged).toBe(true);
  });

  it("rejects missing id", () => {
    expect(() => changesRejectSchema.parse({})).toThrow();
  });

  it("rejects extra keys due to strict", () => {
    expect(() => changesRejectSchema.parse({ id: "a", unknown: true })).toThrow();
  });
});
