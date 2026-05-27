import { describe, expect, it } from "vitest";
import {
  buildChangesApplyArgs,
  buildChangesListArgs,
  buildChangesRejectArgs,
} from "../../src/tools/changes.js";

describe("buildChangesListArgs", () => {
  it("returns empty array for no flags", () => {
    expect(buildChangesListArgs({})).toEqual([]);
  });

  it("adds -a for all", () => {
    expect(buildChangesListArgs({ all: true })).toEqual(["-a"]);
  });

  it("adds -e for every", () => {
    expect(buildChangesListArgs({ every: true })).toEqual(["-e"]);
  });

  it("adds both flags", () => {
    expect(buildChangesListArgs({ all: true, every: true })).toEqual([
      "-a",
      "-e",
    ]);
  });
});

describe("buildChangesApplyArgs", () => {
  it("requires id", () => {
    expect(buildChangesApplyArgs({ id: "abc" })).toEqual(["-i", "abc"]);
  });

  it("adds --snapshot", () => {
    expect(buildChangesApplyArgs({ id: "abc", snapshot: true })).toEqual([
      "-i",
      "abc",
      "--snapshot",
    ]);
  });

  it("adds --hash", () => {
    expect(buildChangesApplyArgs({ id: "abc", hash: "0x123" })).toEqual([
      "-i",
      "abc",
      "--hash",
      "0x123",
    ]);
  });

  it("adds -k for keepStaged", () => {
    expect(buildChangesApplyArgs({ id: "abc", keepStaged: true })).toEqual([
      "-i",
      "abc",
      "-k",
    ]);
  });

  it("adds all optional flags", () => {
    expect(
      buildChangesApplyArgs({
        id: "abc",
        snapshot: true,
        hash: "0x123",
        keepStaged: true,
      })
    ).toEqual(["-i", "abc", "--snapshot", "--hash", "0x123", "-k"]);
  });

  it("omits snapshot when false", () => {
    expect(buildChangesApplyArgs({ id: "abc", snapshot: false })).toEqual([
      "-i",
      "abc",
    ]);
  });
});

describe("buildChangesRejectArgs", () => {
  it("requires id", () => {
    expect(buildChangesRejectArgs({ id: "abc" })).toEqual(["-i", "abc"]);
  });

  it("adds --hash", () => {
    expect(buildChangesRejectArgs({ id: "abc", hash: "0x456" })).toEqual([
      "-i",
      "abc",
      "--hash",
      "0x456",
    ]);
  });

  it("adds -k for keepStaged", () => {
    expect(buildChangesRejectArgs({ id: "abc", keepStaged: true })).toEqual([
      "-i",
      "abc",
      "-k",
    ]);
  });

  it("adds all optional flags", () => {
    expect(
      buildChangesRejectArgs({
        id: "abc",
        hash: "0x456",
        keepStaged: true,
      })
    ).toEqual(["-i", "abc", "--hash", "0x456", "-k"]);
  });
});
