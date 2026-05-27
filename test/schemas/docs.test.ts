import { describe, expect, it } from "vitest";
import { junoDocsSchema, TOPICS } from "../../src/schemas/docs.js";

describe("junoDocsSchema", () => {
  it("accepts a valid topic", () => {
    const result = junoDocsSchema.parse({ topic: "intro" });
    expect(result.topic).toBe("intro");
  });

  it("accepts another valid topic", () => {
    const result = junoDocsSchema.parse({ topic: "build_authentication" });
    expect(result.topic).toBe("build_authentication");
  });

  it("rejects invalid topic", () => {
    expect(() =>
      junoDocsSchema.parse({ topic: "nonexistent_topic" })
    ).toThrow();
  });

  it("rejects missing topic", () => {
    expect(() => junoDocsSchema.parse({})).toThrow();
  });

  it("rejects extra keys due to strict", () => {
    expect(() =>
      junoDocsSchema.parse({ topic: "intro", extra: true })
    ).toThrow();
  });

  it("TOPICS contains intro mapping", () => {
    expect(TOPICS.intro).toBe("/intro.mdx");
  });

  it("TOPICS has many entries", () => {
    expect(Object.keys(TOPICS).length).toBeGreaterThan(100);
  });
});
