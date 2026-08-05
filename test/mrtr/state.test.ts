import { describe, expect, it } from "vitest";
import { mintLoginState } from "../../src/mrtr/state.js";

// verifyRequestState is wired as ServerOptions.requestState.verify: a throw
// here is how the seam refuses tampered/expired state before the handler runs.
describe("requestState codec", () => {
  it("round-trips a verified payload", async () => {
    const state = await mintLoginState({ step: "password" });
    const decoded = await verifyForTest(state);
    expect(decoded).toEqual({ step: "password" });
  });

  it("rejects tampered state", async () => {
    const state = await mintLoginState({ step: "password" });
    const tampered = `${state.slice(0, -4)}AAAA`;
    await expect(verifyForTest(tampered)).rejects.toThrow();
  });

  it("rejects malformed state", async () => {
    await expect(verifyForTest("garbage")).rejects.toThrow();
  });
});

async function verifyForTest(state: string): Promise<unknown> {
  // No bind configured, so the ctx argument is unused.
  return await import("../../src/mrtr/state.js").then((m) =>
    m.verifyRequestState(state, {} as never)
  );
}