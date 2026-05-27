import { describe, expect, it, vi } from "vitest";
import { NETWORK_TIMEOUT } from "../../src/constants.js";
import {
  handleChangesApply,
  handleChangesList,
  handleChangesReject,
} from "../../src/tools/changes.js";

vi.mock("../../src/cli.js", () => ({
  execCli: vi.fn().mockResolvedValue({ stdout: "ok", stderr: "", exitCode: 0 }),
  formatResponse: vi.fn().mockReturnValue({ text: "ok", isError: false }),
}));

import { execCli, formatResponse } from "../../src/cli.js";

const mockExecCli = vi.mocked(execCli);
const mockFormatResponse = vi.mocked(formatResponse);

describe("handleChangesList", () => {
  it("calls execCli with changes list command", async () => {
    const result = await handleChangesList({});
    expect(mockExecCli).toHaveBeenCalledWith(
      "changes",
      ["list"],
      {},
      NETWORK_TIMEOUT
    );
    expect(mockFormatResponse).toHaveBeenCalledWith(
      { stdout: "ok", stderr: "", exitCode: 0 },
      "Changes List"
    );
    expect(result).toEqual({
      content: [{ type: "text", text: "ok" }],
      isError: false,
    });
  });

  it("passes mode and profile flags", async () => {
    await handleChangesList({ mode: "staging", profile: "test" });
    expect(mockExecCli).toHaveBeenCalledWith(
      "changes",
      ["list"],
      { mode: "staging", profile: "test" },
      NETWORK_TIMEOUT
    );
  });

  it("passes all and every flags", async () => {
    await handleChangesList({ all: true, every: true });
    expect(mockExecCli).toHaveBeenCalledWith(
      "changes",
      ["list", "-a", "-e"],
      {},
      NETWORK_TIMEOUT
    );
  });
});

describe("handleChangesApply", () => {
  it("calls execCli with id", async () => {
    await handleChangesApply({ id: "abc-123" });
    expect(mockExecCli).toHaveBeenCalledWith(
      "changes",
      ["apply", "-i", "abc-123"],
      {},
      NETWORK_TIMEOUT
    );
  });

  it("passes optional flags", async () => {
    await handleChangesApply({
      id: "abc",
      snapshot: true,
      hash: "0x123",
      keepStaged: true,
    });
    expect(mockExecCli).toHaveBeenCalledWith(
      "changes",
      ["apply", "-i", "abc", "--snapshot", "--hash", "0x123", "-k"],
      {},
      NETWORK_TIMEOUT
    );
  });
});

describe("handleChangesReject", () => {
  it("calls execCli with id", async () => {
    await handleChangesReject({ id: "abc-123" });
    expect(mockExecCli).toHaveBeenCalledWith(
      "changes",
      ["reject", "-i", "abc-123"],
      {},
      NETWORK_TIMEOUT
    );
  });

  it("passes optional flags", async () => {
    await handleChangesReject({ id: "abc", hash: "0x456", keepStaged: true });
    expect(mockExecCli).toHaveBeenCalledWith(
      "changes",
      ["reject", "-i", "abc", "--hash", "0x456", "-k"],
      {},
      NETWORK_TIMEOUT
    );
  });
});
