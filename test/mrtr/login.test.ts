import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createTestClient } from "../test-utils.js";

const FAKE_JUNO_DIR = join(process.cwd(), "test/fixtures/fake-juno");
const TEST_PASS = "correct-horse-battery";

function withFakeJunoEnv(passFile: string): Record<string, string> {
  return {
    PATH: `${FAKE_JUNO_DIR}:${process.env.PATH ?? ""}`,
    JUNO_FAKE_EXPECTED_PASS: TEST_PASS,
    JUNO_FAKE_PASS_FILE: passFile,
  };
}

describe("MRTR pilot (juno_login passphrase flow)", () => {
  it("round-trips: prompt -> input_required -> passphrase -> completed", async () => {
    const passFile = join(
      mkdtempSync(join(tmpdir(), "juno-mrtr-")),
      "received-pass.txt"
    );
    const { client, cleanup } = await createTestClient(
      undefined,
      {
        capabilities: { elicitation: {} },
        versionNegotiation: { mode: "pin", pin: "2026-07-28" },
      },
      withFakeJunoEnv(passFile)
    );

    try {
      // The client's auto-fulfilment driver dispatches the server's embedded
      // elicitation request to this handler, then retries the tool call.
      client.setRequestHandler("elicitation/create", async () => ({
        action: "accept",
        content: { passphrase: TEST_PASS },
      }));

      const result = await client.callTool({
        name: "juno_login",
        arguments: {},
      });
      const text = result.content
        .map((block) => ("text" in block ? block.text : ""))
        .join("");
      expect(text).toContain("Credentials saved (encrypted)");
      expect(readFileSync(passFile, "utf-8")).toBe(TEST_PASS);
    } finally {
      await cleanup();
    }
  });

  it("serves the same flow on the legacy shim (2025-era client)", async () => {
    const passFile = join(
      mkdtempSync(join(tmpdir(), "juno-mrtr-legacy-")),
      "received-pass.txt"
    );
    const { client, cleanup } = await createTestClient(
      undefined,
      { capabilities: { elicitation: {} } },
      withFakeJunoEnv(passFile)
    );

    try {
      client.setRequestHandler("elicitation/create", async () => ({
        action: "accept",
        content: { passphrase: TEST_PASS },
      }));

      const result = await client.callTool({
        name: "juno_login",
        arguments: {},
      });
      const text = result.content
        .map((block) => ("text" in block ? block.text : ""))
        .join("");
      expect(text).toContain("Credentials saved (encrypted)");
    } finally {
      await cleanup();
    }
  });

  it("fails when the passphrase is wrong (isError result)", async () => {
    const passFile = join(
      mkdtempSync(join(tmpdir(), "juno-mrtr-wrong-")),
      "received-pass.txt"
    );
    const { client, cleanup } = await createTestClient(
      undefined,
      {
        capabilities: { elicitation: {} },
        versionNegotiation: { mode: "pin", pin: "2026-07-28" },
      },
      withFakeJunoEnv(passFile)
    );

    try {
      client.setRequestHandler("elicitation/create", async () => ({
        action: "accept",
        content: { passphrase: "wrong-passphrase" },
      }));

      const result = await client.callTool({
        name: "juno_login",
        arguments: {},
      });
      const text = result.content
        .map((block) => ("text" in block ? block.text : ""))
        .join("");
      expect(text).toContain("Passphrase mismatch");
      expect(result.isError).toBe(true);
    } finally {
      await cleanup();
    }
  });
});
