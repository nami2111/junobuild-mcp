import { describe, it, expect } from "vitest";
import {
  buildRunScriptArgs,
  buildStatusArgs
} from "../../src/tools/identity.js";

describe("buildRunScriptArgs", () => {
  it("returns -s with src", () => {
    expect(buildRunScriptArgs({ src: "script.js" })).toEqual(["-s", "script.js"]);
  });

  it("works with ts files", () => {
    expect(buildRunScriptArgs({ src: "deploy.ts" })).toEqual(["-s", "deploy.ts"]);
  });
});

describe("buildStatusArgs", () => {
  it("returns empty array with no args", () => {
    expect(buildStatusArgs({})).toEqual([]);
  });

  it("adds --container-url", () => {
    expect(buildStatusArgs({ containerUrl: "https://container.example.com" })).toEqual([
      "--container-url", "https://container.example.com"
    ]);
  });

  it("adds --console-url", () => {
    expect(buildStatusArgs({ consoleUrl: "https://console.example.com" })).toEqual([
      "--console-url", "https://console.example.com"
    ]);
  });

  it("adds both URLs", () => {
    expect(buildStatusArgs({
      containerUrl: "https://container.example.com",
      consoleUrl: "https://console.example.com"
    })).toEqual([
      "--container-url", "https://container.example.com",
      "--console-url", "https://console.example.com"
    ]);
  });
});
