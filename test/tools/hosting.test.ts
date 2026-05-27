import { describe, it, expect } from "vitest";
import {
  buildHostingDeployArgs,
  buildHostingClearArgs,
  buildHostingPruneArgs
} from "../../src/tools/hosting.js";

describe("buildHostingDeployArgs", () => {
  it("returns --batch with default", () => {
    const args = buildHostingDeployArgs({ batch: 50 });
    expect(args).toContain("--batch");
    expect(args).toContain("50");
  });

  it("adds --clear", () => {
    const args = buildHostingDeployArgs({ batch: 50, clear: true });
    expect(args).toContain("--clear");
  });

  it("adds --prune", () => {
    const args = buildHostingDeployArgs({ batch: 50, prune: true });
    expect(args).toContain("--prune");
  });

  it("adds -i for immediate", () => {
    const args = buildHostingDeployArgs({ batch: 50, immediate: true });
    expect(args).toContain("-i");
  });

  it("adds -k for keepStaged when applying immediately", () => {
    const args = buildHostingDeployArgs({ batch: 50, keepStaged: true });
    expect(args).toContain("-k");
  });

  it("adds --no-apply", () => {
    const args = buildHostingDeployArgs({ batch: 50, noApply: true });
    expect(args).toContain("--no-apply");
  });

  it("adds --config", () => {
    const args = buildHostingDeployArgs({ batch: 50, config: true });
    expect(args).toContain("--config");
  });

  it("does not add optional flags when false", () => {
    const args = buildHostingDeployArgs({ batch: 50 });
    expect(args).not.toContain("--clear");
    expect(args).not.toContain("--prune");
    expect(args).not.toContain("-i");
    expect(args).not.toContain("-k");
    expect(args).not.toContain("--no-apply");
    expect(args).not.toContain("--config");
  });

  it("does not add -k when noApply is true", () => {
    const args = buildHostingDeployArgs({ batch: 50, noApply: true, keepStaged: true });
    expect(args).toEqual(["--batch", "50", "--no-apply"]);
  });

  it("adds compatible flags when enabled", () => {
    const args = buildHostingDeployArgs({
      batch: 10,
      clear: true,
      prune: true,
      immediate: true,
      keepStaged: true,
      config: true
    });
    expect(args).toEqual([
      "--batch", "10",
      "--clear",
      "--prune",
      "-i",
      "-k",
      "--config"
    ]);
  });

  it("supports batch at max value", () => {
    const args = buildHostingDeployArgs({ batch: 200 });
    expect(args).toContain("200");
  });

  it("supports batch at min value", () => {
    const args = buildHostingDeployArgs({ batch: 1 });
    expect(args).toContain("1");
  });
});

describe("buildHostingClearArgs", () => {
  it("returns empty array when no fullPath", () => {
    expect(buildHostingClearArgs({})).toEqual([]);
  });

  it("adds -f with fullPath", () => {
    expect(buildHostingClearArgs({ fullPath: "/index.html" })).toEqual(["-f", "/index.html"]);
  });
});

describe("buildHostingPruneArgs", () => {
  it("returns --batch with default", () => {
    const args = buildHostingPruneArgs({ batch: 100 });
    expect(args).toContain("--batch");
    expect(args).toContain("100");
  });

  it("adds --dry-run", () => {
    const args = buildHostingPruneArgs({ batch: 100, dryRun: true });
    expect(args).toContain("--dry-run");
  });

  it("does not add --dry-run when false", () => {
    const args = buildHostingPruneArgs({ batch: 100 });
    expect(args).not.toContain("--dry-run");
  });

  it("handles custom batch", () => {
    const args = buildHostingPruneArgs({ batch: 50, dryRun: true });
    expect(args).toEqual(["--batch", "50", "--dry-run"]);
  });
});
