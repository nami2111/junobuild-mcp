import { describe, expect, it } from "vitest";
import {
  getProgressPatterns,
  MODERN_PATTERNS,
  type ProgressPatterns,
  parseProgressLine,
} from "../src/progress-patterns.js";

const BATCH_COUNTER = /\[(\d+)\/(\d+)\]/;

describe("getProgressPatterns", () => {
  it("defaults to the modern set for any known or unknown version", () => {
    expect(getProgressPatterns()).toBe(MODERN_PATTERNS);
    expect(getProgressPatterns("0.15.6")).toBe(MODERN_PATTERNS);
    expect(getProgressPatterns("1.0.0")).toBe(MODERN_PATTERNS);
  });
});

describe("parseProgressLine", () => {
  it("spreads progress across the phases of a batch", () => {
    const modern: ProgressPatterns = {
      batchPattern: BATCH_COUNTER,
      phases: ["Initializing", "Uploading", "Committing"],
    };
    expect(parseProgressLine("[1/3] Initializing", modern)).toEqual({
      progress: 11,
      message: "Initializing batch 1/3",
    });
    expect(parseProgressLine("[2/3] Uploading", modern)).toEqual({
      progress: 56,
      message: "Uploading batch 2/3",
    });
    expect(parseProgressLine("[3/3] Committing", modern)).toEqual({
      progress: 99,
      message: "Committing batch 3/3",
    });
  });

  it("honors a different phase set (older CLI output)", () => {
    const legacy: ProgressPatterns = {
      batchPattern: BATCH_COUNTER,
      phases: ["Uploading"],
    };
    expect(parseProgressLine("[2/4] Uploading", legacy)).toEqual({
      progress: 50,
      message: "Uploading batch 2/4",
    });
  });

  it("returns null for non-progress lines", () => {
    expect(parseProgressLine("Building...")).toBeNull();
    expect(parseProgressLine("")).toBeNull();
  });

  it("returns null for a zero total", () => {
    expect(parseProgressLine("[1/0] Initializing")).toBeNull();
  });
});
