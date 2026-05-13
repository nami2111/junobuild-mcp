import { describe, it, expect } from "vitest";
import {
  buildFunctionsBuildArgs,
  buildFunctionsEjectArgs,
  buildFunctionsPublishArgs,
  buildFunctionsUpgradeArgs
} from "../../src/tools/functions.js";

describe("buildFunctionsBuildArgs", () => {
  it("returns empty array with no args", () => {
    expect(buildFunctionsBuildArgs({})).toEqual([]);
  });

  it("adds -l with lang", () => {
    expect(buildFunctionsBuildArgs({ lang: "rust" })).toEqual(["-l", "rust"]);
  });

  it("adds --cargo-path", () => {
    expect(buildFunctionsBuildArgs({ cargoPath: "./Cargo.toml" })).toEqual([
      "--cargo-path", "./Cargo.toml"
    ]);
  });

  it("adds --source-path", () => {
    expect(buildFunctionsBuildArgs({ sourcePath: "./src/lib.rs" })).toEqual([
      "--source-path", "./src/lib.rs"
    ]);
  });

  it("adds --watch", () => {
    expect(buildFunctionsBuildArgs({ watch: true })).toEqual(["--watch"]);
  });

  it("does not add --watch when false", () => {
    expect(buildFunctionsBuildArgs({ watch: false })).toEqual([]);
  });

  it("adds all args", () => {
    expect(buildFunctionsBuildArgs({
      lang: "ts",
      cargoPath: "./Cargo.toml",
      sourcePath: "./src/index.ts",
      watch: true
    })).toEqual([
      "-l", "ts",
      "--cargo-path", "./Cargo.toml",
      "--source-path", "./src/index.ts",
      "--watch"
    ]);
  });
});

describe("buildFunctionsEjectArgs", () => {
  it("returns empty array with no lang", () => {
    expect(buildFunctionsEjectArgs({})).toEqual([]);
  });

  it("adds -l with lang", () => {
    expect(buildFunctionsEjectArgs({ lang: "typescript" })).toEqual(["-l", "typescript"]);
  });

  it("accepts short lang codes", () => {
    expect(buildFunctionsEjectArgs({ lang: "rs" })).toEqual(["-l", "rs"]);
  });
});

describe("buildFunctionsPublishArgs", () => {
  it("returns empty array with defaults", () => {
    expect(buildFunctionsPublishArgs({})).toEqual([]);
  });

  it("adds -s with src", () => {
    expect(buildFunctionsPublishArgs({ src: "./out.wasm.gz" })).toEqual([
      "-s", "./out.wasm.gz"
    ]);
  });

  it("adds --no-apply", () => {
    expect(buildFunctionsPublishArgs({ noApply: true })).toEqual(["--no-apply"]);
  });

  it("adds -k for keepStaged", () => {
    expect(buildFunctionsPublishArgs({ keepStaged: true })).toEqual(["-k"]);
  });

  it("does not add progress or retry (they control execution path)", () => {
    const args = buildFunctionsPublishArgs({ progress: true, retry: true });
    expect(args).toEqual([]);
  });

  it("adds all arg flags", () => {
    expect(buildFunctionsPublishArgs({
      src: "./out.wasm.gz",
      noApply: true,
      keepStaged: true
    })).toEqual([
      "-s", "./out.wasm.gz",
      "--no-apply",
      "-k"
    ]);
  });
});

describe("buildFunctionsUpgradeArgs", () => {
  it("returns empty array with defaults", () => {
    expect(buildFunctionsUpgradeArgs({})).toEqual([]);
  });

  it("adds -s with src", () => {
    expect(buildFunctionsUpgradeArgs({ src: "./new.wasm.gz" })).toEqual([
      "-s", "./new.wasm.gz"
    ]);
  });

  it("adds --cdn", () => {
    expect(buildFunctionsUpgradeArgs({ cdn: true })).toEqual(["--cdn"]);
  });

  it("adds --cdn-path", () => {
    expect(buildFunctionsUpgradeArgs({ cdnPath: "v1/snapshot.wasm.gz" })).toEqual([
      "--cdn-path", "v1/snapshot.wasm.gz"
    ]);
  });

  it("adds --clear-chunks", () => {
    expect(buildFunctionsUpgradeArgs({ clearChunks: true })).toEqual(["--clear-chunks"]);
  });

  it("adds --no-snapshot", () => {
    expect(buildFunctionsUpgradeArgs({ noSnapshot: true })).toEqual(["--no-snapshot"]);
  });

  it("adds -r for reset", () => {
    expect(buildFunctionsUpgradeArgs({ reset: true })).toEqual(["-r"]);
  });

  it("does not add progress or retry (they control execution path)", () => {
    const args = buildFunctionsUpgradeArgs({ progress: true, retry: true });
    expect(args).toEqual([]);
  });

  it("adds all arg flags", () => {
    expect(buildFunctionsUpgradeArgs({
      src: "./new.wasm.gz",
      cdn: true,
      cdnPath: "v1/snapshot.wasm.gz",
      clearChunks: true,
      noSnapshot: true,
      reset: true
    })).toEqual([
      "-s", "./new.wasm.gz",
      "--cdn",
      "--cdn-path", "v1/snapshot.wasm.gz",
      "--clear-chunks",
      "--no-snapshot",
      "-r"
    ]);
  });
});
