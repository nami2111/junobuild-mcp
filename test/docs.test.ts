import { describe, it, expect } from "vitest";
import { getAlternatePath } from "../src/tools/docs.js";

describe("getAlternatePath", () => {
  it("converts .mdx to .md", () => {
    expect(getAlternatePath("/build/authentication/index.md")).toBe("/build/authentication/index.mdx");
  });

  it("converts .md to .mdx", () => {
    expect(getAlternatePath("/build/authentication/index.mdx")).toBe("/build/authentication/index.md");
  });

  it("handles paths with multiple dots", () => {
    expect(getAlternatePath("/reference/cli/emulator-start.md")).toBe("/reference/cli/emulator-start.mdx");
  });

  it("handles paths in subdirectories", () => {
    expect(getAlternatePath("/guides/local-development.mdx")).toBe("/guides/local-development.md");
  });
});
