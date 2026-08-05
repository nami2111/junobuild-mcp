import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { tuneBatch } from "../../src/tools/hosting.js";

const tempDirs: string[] = [];

function makeProject(files: Record<string, string>): string {
  const cwd = mkdtempSync(join(tmpdir(), "juno-batch-"));
  tempDirs.push(cwd);
  for (const [rel, content] of Object.entries(files)) {
    const path = join(cwd, rel);
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, content);
  }
  return cwd;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("tuneBatch", () => {
  it("caps batch at the source file count", () => {
    const cwd = makeProject({
      "juno.config.ts": 'export const junoConfig = { source: "dist" };\n',
      "dist/a.js": "a",
      "dist/b.js": "b",
      "dist/c.css": "c",
    });
    expect(tuneBatch(50, cwd)).toBe(3);
    expect(tuneBatch(2, cwd)).toBe(2);
  });

  it("recognizes json configs", () => {
    const cwd = makeProject({
      "juno.config.json": '{ "source": "build" }\n',
      "build/out.html": "o",
    });
    expect(tuneBatch(50, cwd)).toBe(1);
  });

  it("stays at batch when no config or source dir is found", () => {
    const cwd = makeProject({ "src/main.ts": "x" });
    expect(tuneBatch(50, cwd)).toBe(50);
  });

  it("ignores node_modules and dotfiles when counting", () => {
    const cwd = makeProject({
      "juno.config.ts": 'export const junoConfig = { source: "dist" };\n',
      "dist/index.html": "h",
      "dist/.well-known/file": "w",
      "dist/node_modules/pkg/index.js": "n",
    });
    expect(tuneBatch(50, cwd)).toBe(1);
  });
});
