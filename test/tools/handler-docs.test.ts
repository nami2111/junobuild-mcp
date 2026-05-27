import { beforeEach, describe, expect, it, vi } from "vitest";
import { CHARACTER_LIMIT } from "../../src/constants.js";
import { handleDocFetch } from "../../src/tools/docs.js";

describe("handleDocFetch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches doc and returns content", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: () => Promise.resolve("# Intro\n\nWelcome to Juno"),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await handleDocFetch({ topic: "build_authentication" });
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain("Juno Docs: build_authentication");
    expect(result.content[0].text).toContain("Welcome to Juno");
  });

  it("returns cached content on second call", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: () => Promise.resolve("content"),
    });
    vi.stubGlobal("fetch", fetchFn);

    await handleDocFetch({ topic: "build_datastore" });
    const result = await handleDocFetch({ topic: "build_datastore" });
    expect(result.content[0].text).toContain("(cached)");
    // fetch should only be called once (second call reads cache)
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("returns error on fetch failure", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await handleDocFetch({ topic: "build_hosting" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Failed to fetch");
  });

  it("truncates content exceeding CHARACTER_LIMIT", async () => {
    const longContent = "x".repeat(CHARACTER_LIMIT + 1000);
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: () => Promise.resolve(longContent),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await handleDocFetch({ topic: "build_storage" });
    expect(result.content[0].text).toContain("...(truncated)");
  });
});
