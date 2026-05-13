import { describe, it, expect } from "vitest";
import { buildConfigApplyArgs } from "../../src/tools/config.js";
import {
  generateTypeScriptConfig,
  generateJavaScriptConfig,
  generateJsonConfig,
  buildConfigOptionsSnippet
} from "../../src/tools/config.js";

type ConfigInitParams = {
  format: "typescript" | "javascript" | "json";
  source: string;
  satelliteId: string;
  multiEnv: boolean;
  stagingSatelliteId?: string;
  orbiterId?: string;
  writeFile: boolean;
  path?: string;
};

describe("buildConfigApplyArgs", () => {
  it("returns empty array when force is false", () => {
    expect(buildConfigApplyArgs({ force: false })).toEqual([]);
  });

  it("adds --force when force is true", () => {
    expect(buildConfigApplyArgs({ force: true })).toEqual(["--force"]);
  });

  it("returns empty array when not provided", () => {
    expect(buildConfigApplyArgs({})).toEqual([]);
  });
});

describe("buildConfigOptionsSnippet", () => {
  const baseParams: ConfigInitParams = {
    format: "typescript",
    source: "dist",
    satelliteId: "abc-123",
    multiEnv: false,
    writeFile: false
  };

  it("generates single-env satellite block", () => {
    const result = buildConfigOptionsSnippet(baseParams);
    expect(result).toContain('id: "abc-123"');
    expect(result).toContain('source: "dist"');
    expect(result).not.toContain("staging");
  });

  it("generates multi-env satellite block", () => {
    const result = buildConfigOptionsSnippet({ ...baseParams, multiEnv: true });
    expect(result).toContain("production:");
    expect(result).toContain("staging:");
  });

  it("includes orbiterId when provided", () => {
    const result = buildConfigOptionsSnippet({ ...baseParams, orbiterId: "orb-1" });
    expect(result).toContain("orbiter");
    expect(result).toContain("orb-1");
  });

  it("generates multi-env with staging satellite id", () => {
    const result = buildConfigOptionsSnippet({
      ...baseParams,
      multiEnv: true,
      stagingSatelliteId: "stg-123"
    });
    expect(result).toContain("stg-123");
  });

  it("generates multi-env with orbiter", () => {
    const result = buildConfigOptionsSnippet({
      ...baseParams,
      multiEnv: true,
      orbiterId: "orb-1"
    });
    expect(result).toContain("orbiter");
    expect(result).toContain("production:");
  });
});

describe("generateTypeScriptConfig", () => {
  it("produces valid TypeScript config output", () => {
    const params: ConfigInitParams = {
      format: "typescript",
      source: "dist",
      satelliteId: "abc-123",
      multiEnv: false,
      writeFile: false
    };
    const result = generateTypeScriptConfig(params);
    expect(result).toContain("defineConfig");
    expect(result).toContain("abc-123");
    expect(result).toContain("dist");
  });
});

describe("generateJavaScriptConfig", () => {
  it("produces valid JavaScript config output", () => {
    const params: ConfigInitParams = {
      format: "javascript",
      source: "build",
      satelliteId: "abc-123",
      multiEnv: false,
      writeFile: false
    };
    const result = generateJavaScriptConfig(params);
    expect(result).toContain("defineConfig");
    expect(result).toContain("abc-123");
    expect(result).toContain("build");
  });
});

describe("generateJsonConfig", () => {
  it("produces valid JSON config output", () => {
    const params: ConfigInitParams = {
      format: "json",
      source: "out",
      satelliteId: "abc-123",
      multiEnv: false,
      writeFile: false
    };
    const result = generateJsonConfig(params);
    expect(result).toContain("abc-123");
    expect(result).toContain("out");
    const parsed = JSON.parse(result);
    expect(parsed.satellite.id).toBe("abc-123");
  });

  it("produces multi-env JSON", () => {
    const params: ConfigInitParams = {
      format: "json",
      source: "dist",
      satelliteId: "prod-123",
      multiEnv: true,
      stagingSatelliteId: "stg-456",
      writeFile: false
    };
    const result = generateJsonConfig(params);
    const parsed = JSON.parse(result);
    expect(parsed.satellite.ids.production).toBe("prod-123");
    expect(parsed.satellite.ids.staging).toBe("stg-456");
  });
});
