import { describe, expect, it } from "vitest";
import { LRUCache } from "../../src/lru-cache.js";

describe("LRUCache", () => {
  it("throws when capacity is zero or negative", () => {
    expect(() => new LRUCache<string, number>(0)).toThrow();
    expect(() => new LRUCache<string, number>(-1)).toThrow();
  });

  it("stores and retrieves values", () => {
    const cache = new LRUCache<string, number>(3);
    cache.set("a", 1);
    cache.set("b", 2);
    expect(cache.get("a")).toBe(1);
    expect(cache.get("b")).toBe(2);
    expect(cache.size).toBe(2);
  });

  it("returns undefined for missing keys", () => {
    const cache = new LRUCache<string, number>(3);
    expect(cache.get("nope")).toBeUndefined();
  });

  it("reports has() correctly", () => {
    const cache = new LRUCache<string, number>(3);
    cache.set("a", 1);
    expect(cache.has("a")).toBe(true);
    expect(cache.has("b")).toBe(false);
  });

  it("evicts least-recently-used entry when at capacity", () => {
    const cache = new LRUCache<string, number>(2);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    expect(cache.has("a")).toBe(false);
    expect(cache.has("b")).toBe(true);
    expect(cache.has("c")).toBe(true);
    expect(cache.size).toBe(2);
  });

  it("get() updates recency", () => {
    const cache = new LRUCache<string, number>(2);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.get("a");
    cache.set("c", 3);
    expect(cache.has("a")).toBe(true);
    expect(cache.has("b")).toBe(false);
    expect(cache.has("c")).toBe(true);
  });

  it("set() on existing key updates value and recency", () => {
    const cache = new LRUCache<string, number>(2);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("a", 99);
    cache.set("c", 3);
    expect(cache.get("a")).toBe(99);
    expect(cache.has("b")).toBe(false);
    expect(cache.has("c")).toBe(true);
  });

  it("peek() does not update recency", () => {
    const cache = new LRUCache<string, number>(2);
    cache.set("a", 1);
    cache.set("b", 2);
    expect(cache.peek("a")).toBe(1);
    cache.set("c", 3);
    expect(cache.has("a")).toBe(false);
    expect(cache.has("b")).toBe(true);
    expect(cache.has("c")).toBe(true);
  });

  it("delete() removes entries", () => {
    const cache = new LRUCache<string, number>(3);
    cache.set("a", 1);
    cache.set("b", 2);
    expect(cache.delete("a")).toBe(true);
    expect(cache.has("a")).toBe(false);
    expect(cache.size).toBe(1);
    expect(cache.delete("missing")).toBe(false);
  });

  it("delete() of head and tail keeps list consistent", () => {
    const cache = new LRUCache<string, number>(3);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    cache.delete("c");
    cache.delete("a");
    expect(Array.from(cache.entries())).toEqual([["b", 2]]);
    cache.set("d", 4);
    cache.set("e", 5);
    expect(Array.from(cache.entries())).toEqual([
      ["e", 5],
      ["d", 4],
      ["b", 2],
    ]);
  });

  it("clear() empties the cache", () => {
    const cache = new LRUCache<string, number>(3);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.has("a")).toBe(false);
    cache.set("c", 3);
    expect(cache.has("c")).toBe(true);
  });

  it("entries() yields in MRU-first order", () => {
    const cache = new LRUCache<string, number>(3);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    cache.get("a");
    expect(Array.from(cache.entries())).toEqual([
      ["a", 1],
      ["c", 3],
      ["b", 2],
    ]);
  });

  it("evicts in correct order under mixed access", () => {
    const cache = new LRUCache<string, number>(3);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    cache.get("a");
    cache.set("d", 4);
    expect(cache.has("b")).toBe(false);
    cache.get("c");
    cache.set("e", 5);
    expect(cache.has("a")).toBe(false);
    expect(cache.has("c")).toBe(true);
    expect(cache.has("d")).toBe(true);
    expect(cache.has("e")).toBe(true);
  });

  it("handles capacity of 1", () => {
    const cache = new LRUCache<string, number>(1);
    cache.set("a", 1);
    cache.set("b", 2);
    expect(cache.has("a")).toBe(false);
    expect(cache.has("b")).toBe(true);
    expect(cache.size).toBe(1);
  });
});
