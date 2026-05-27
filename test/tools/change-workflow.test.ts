import { describe, it, expect } from "vitest";
import {
  buildChangeApplyArgs,
  buildChangeRejectArgs,
  buildChangeSubmissionArgs,
  buildInstantChangeArgs
} from "../../src/change-workflow.js";

describe("change workflow args", () => {
  it("keeps staged assets only when a submitted change is applied immediately", () => {
    expect(buildChangeSubmissionArgs({ keepStaged: true })).toEqual(["-k"]);
    expect(buildChangeSubmissionArgs({ noApply: true, keepStaged: true })).toEqual([
      "--no-apply"
    ]);
  });

  it("adds immediate before submission flags", () => {
    expect(buildInstantChangeArgs({ immediate: true, keepStaged: true })).toEqual(["-i", "-k"]);
  });

  it("builds change apply verification args", () => {
    expect(
      buildChangeApplyArgs({ id: "abc", snapshot: true, hash: "0x123", keepStaged: true })
    ).toEqual(["-i", "abc", "--snapshot", "--hash", "0x123", "-k"]);
  });

  it("builds change reject verification args", () => {
    expect(buildChangeRejectArgs({ id: "abc", hash: "0x456", keepStaged: true })).toEqual([
      "-i",
      "abc",
      "--hash",
      "0x456",
      "-k"
    ]);
  });
});
