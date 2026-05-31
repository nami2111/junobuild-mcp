import { describe, expect, it } from "vitest";
import { runProcess } from "../../src/executor.js";

describe("stdin automation (prompt detection)", () => {
  it("sends answer when prompt string matches stdout", async () => {
    const script = "echo 'Enter name:'; read name; echo \"got:$name\"";
    const result = await runProcess("bash", ["-c", script], 10_000, {
      stdinConfig: {
        answers: ["alice"],
        prompts: ["enter name"],
        promptTimeout: 5000,
      },
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("got:alice");
  }, 15_000);

  it("sends answer when prompt regex matches", async () => {
    const script = "echo 'Username:'; read u; echo \"u=$u\"";
    const result = await runProcess("bash", ["-c", script], 10_000, {
      stdinConfig: {
        answers: ["bob"],
        prompts: [/User\w+:/],
        promptTimeout: 5000,
      },
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("u=bob");
  }, 15_000);

  it("falls back to sending answer when prompt never appears", async () => {
    const script = 'read x; echo "got=$x"';
    const start = Date.now();
    const result = await runProcess("bash", ["-c", script], 10_000, {
      stdinConfig: {
        answers: ["fallback"],
        prompts: ["never-shown"],
        promptTimeout: 500,
      },
    });
    const elapsed = Date.now() - start;
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("got=fallback");
    expect(elapsed).toBeGreaterThanOrEqual(500);
    expect(elapsed).toBeLessThan(5000);
  }, 15_000);

  it("sends multiple answers in sequence, each gated on prompt", async () => {
    const script =
      "echo 'first:'; read a; echo 'second:'; read b; echo \"a=$a b=$b\"";
    const result = await runProcess("bash", ["-c", script], 10_000, {
      stdinConfig: {
        answers: ["one", "two"],
        prompts: ["first:", "second:"],
        promptTimeout: 5000,
      },
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("a=one b=two");
  }, 15_000);

  it("uses configurable initialDelay when no prompts", async () => {
    const start = Date.now();
    const result = await runProcess("cat", [], 5000, {
      stdinConfig: {
        answers: ["hi"],
        initialDelay: 100,
      },
    });
    const elapsed = Date.now() - start;
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("hi");
    expect(elapsed).toBeLessThan(2000);
  }, 10_000);

  it("backward-compat: stdinAnswers still works", async () => {
    const result = await runProcess("cat", [], 10_000, {
      stdinAnswers: ["legacy"],
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("legacy");
  }, 15_000);

  it("reuses last prompt pattern when prompts.length < answers.length", async () => {
    const script = "echo 'Q:'; read a; echo 'Q:'; read b; echo \"a=$a b=$b\"";
    const result = await runProcess("bash", ["-c", script], 10_000, {
      stdinConfig: {
        answers: ["x", "y"],
        prompts: ["Q:"],
        promptTimeout: 5000,
      },
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("a=x b=y");
  }, 15_000);
});
