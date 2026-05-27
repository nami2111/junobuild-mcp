import { describe, it, expect } from "vitest";
import { configInitSchema, configApplySchema } from "../../src/schemas/config.js";
import { createProjectSchema } from "../../src/schemas/project.js";

describe("configInitSchema", () => {
  it("applies defaults", () => {
    const result = configInitSchema.parse({});
    expect(result.format).toBe("typescript");
    expect(result.source).toBe("dist");
    expect(result.satelliteId).toBe("aaaaa-bbbbb-ccccc-ddddd-cai");
    expect(result.multiEnv).toBe(false);
    expect(result.writeFile).toBe(false);
  });

  it("accepts explicit values", () => {
    const result = configInitSchema.parse({
      format: "json",
      source: "build",
      satelliteId: "custom-id",
      multiEnv: true,
      stagingSatelliteId: "staging-id",
      orbiterId: "orbiter-1",
      writeFile: true,
      path: "juno.config.json"
    });
    expect(result.format).toBe("json");
    expect(result.source).toBe("build");
    expect(result.satelliteId).toBe("custom-id");
    expect(result.multiEnv).toBe(true);
    expect(result.stagingSatelliteId).toBe("staging-id");
    expect(result.orbiterId).toBe("orbiter-1");
    expect(result.writeFile).toBe(true);
    expect(result.path).toBe("juno.config.json");
  });

  it("rejects invalid format", () => {
    expect(() => configInitSchema.parse({ format: "yaml" })).toThrow();
  });

  it("rejects path with traversal", () => {
    expect(() => configInitSchema.parse({ path: "../etc/passwd" })).toThrow();
    expect(() => configInitSchema.parse({ path: "a/../../b" })).toThrow();
  });

  it("rejects absolute path", () => {
    expect(() => configInitSchema.parse({ path: "/etc/passwd" })).toThrow();
  });

  it("accepts relative path without traversal", () => {
    const result = configInitSchema.parse({ path: "configs/juno.config.json" });
    expect(result.path).toBe("configs/juno.config.json");
  });

  it("rejects extra keys due to strict", () => {
    expect(() => configInitSchema.parse({ unknown: true })).toThrow();
  });
});

describe("configApplySchema", () => {
  it("applies defaults", () => {
    const result = configApplySchema.parse({});
    expect(result.force).toBe(false);
  });

  it("accepts force flag", () => {
    const result = configApplySchema.parse({ force: true });
    expect(result.force).toBe(true);
  });

  it("rejects extra keys due to strict", () => {
    expect(() => configApplySchema.parse({ unknown: true })).toThrow();
  });
});

describe("createProjectSchema", () => {
  it("requires directory", () => {
    const result = createProjectSchema.parse({ directory: "my-app" });
    expect(result.directory).toBe("my-app");
    expect(result.packageManager).toBe("npm");
  });

  it("accepts all fields", () => {
    const result = createProjectSchema.parse({
      directory: "my-app",
      template: "sveltekit-starter",
      packageManager: "pnpm"
    });
    expect(result.directory).toBe("my-app");
    expect(result.template).toBe("sveltekit-starter");
    expect(result.packageManager).toBe("pnpm");
  });

  it("rejects missing directory", () => {
    expect(() => createProjectSchema.parse({})).toThrow();
  });

  it("rejects invalid package manager", () => {
    expect(() => createProjectSchema.parse({ directory: "a", packageManager: "bun" })).toThrow();
  });
});
