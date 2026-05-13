import { describe, it, expect } from "vitest";
import { FunctionLanguageEnum, PackageManagerEnum, ConfigFormatEnum } from "../../src/schemas/enums.js";

describe("FunctionLanguageEnum", () => {
  it("accepts valid languages", () => {
    expect(FunctionLanguageEnum.parse("rust")).toBe("rust");
    expect(FunctionLanguageEnum.parse("rs")).toBe("rs");
    expect(FunctionLanguageEnum.parse("typescript")).toBe("typescript");
    expect(FunctionLanguageEnum.parse("ts")).toBe("ts");
    expect(FunctionLanguageEnum.parse("javascript")).toBe("javascript");
    expect(FunctionLanguageEnum.parse("mjs")).toBe("mjs");
  });

  it("rejects invalid languages", () => {
    expect(() => FunctionLanguageEnum.parse("python")).toThrow();
    expect(() => FunctionLanguageEnum.parse("go")).toThrow();
    expect(() => FunctionLanguageEnum.parse("")).toThrow();
  });
});

describe("PackageManagerEnum", () => {
  it("accepts npm, yarn, pnpm", () => {
    expect(PackageManagerEnum.parse("npm")).toBe("npm");
    expect(PackageManagerEnum.parse("yarn")).toBe("yarn");
    expect(PackageManagerEnum.parse("pnpm")).toBe("pnpm");
  });

  it("rejects invalid package managers", () => {
    expect(() => PackageManagerEnum.parse("bun")).toThrow();
    expect(() => PackageManagerEnum.parse("npx")).toThrow();
  });
});

describe("ConfigFormatEnum", () => {
  it("accepts typescript, javascript, json", () => {
    expect(ConfigFormatEnum.parse("typescript")).toBe("typescript");
    expect(ConfigFormatEnum.parse("javascript")).toBe("javascript");
    expect(ConfigFormatEnum.parse("json")).toBe("json");
  });

  it("rejects invalid formats", () => {
    expect(() => ConfigFormatEnum.parse("yaml")).toThrow();
    expect(() => ConfigFormatEnum.parse("toml")).toThrow();
  });
});
