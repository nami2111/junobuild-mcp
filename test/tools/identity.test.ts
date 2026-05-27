import { describe, it, expect } from "vitest";
import { buildRunScriptArgs } from "../../src/tools/identity.js";
import { buildJunoContextArgs, environmentContext } from "../../src/juno-context.js";

describe("buildRunScriptArgs", () => {
  it("returns -s with src", () => {
    expect(buildRunScriptArgs({ src: "script.js" })).toEqual(["-s", "script.js"]);
  });

  it("works with ts files", () => {
    expect(buildRunScriptArgs({ src: "deploy.ts" })).toEqual(["-s", "deploy.ts"]);
  });
});

describe("buildJunoContextArgs", () => {
  it("adds --container-url", () => {
    expect(
      buildJunoContextArgs(
        { containerUrl: "https://container.example.com" },
        environmentContext
      )
    ).toEqual(["--container-url", "https://container.example.com"]);
  });

  it("adds --console-url", () => {
    expect(
      buildJunoContextArgs({ consoleUrl: "https://console.example.com" }, environmentContext)
    ).toEqual(["--console-url", "https://console.example.com"]);
  });

  it("adds mode, profile, and URLs in CLI order", () => {
    expect(
      buildJunoContextArgs(
        {
          mode: "development",
          profile: "dev",
          containerUrl: "https://container.example.com",
          consoleUrl: "https://console.example.com"
        },
        environmentContext
      )
    ).toEqual([
      "--mode", "development",
      "--profile", "dev",
      "--container-url", "https://container.example.com",
      "--console-url", "https://console.example.com"
    ]);
  });
});
