import { createInterface } from "node:readline";
import { spawn } from "node:child_process";
import type { CliResult } from "./types.js";
import { DEFAULT_TIMEOUT } from "./constants.js";

const ANSI_REGEX = /\x1b\[[0-9;]*[a-zA-Z]|\x1b\].*?(?:\x1b\\|\x07)|\r/g;
const UNICODE_SPINNERS = /[\u2800-\u28FF\u2713\u2717\u25FC\u25C0\u2728\u{1F4E6}]/gu;
const REPEATED_Z = /^z{2,}$/m;

export function stripAnsi(text: string): string {
  return text.replace(ANSI_REGEX, "").replace(/\r?\n/g, "\n");
}

export function stripProgressChars(text: string): string {
  return text.replace(UNICODE_SPINNERS, "").replace(REPEATED_Z, "").replace(/\r?\n/g, "\n");
}

export type ProgressCallback = (progress: number, message: string) => void;

export interface RunProcessOptions {
  cwd?: string;
  stdinAnswers?: string[];
  onProgress?: ProgressCallback;
}

export function runProcess(
  cmd: string,
  args: string[],
  timeout: number,
  options?: RunProcessOptions
): Promise<CliResult> {
  return new Promise<CliResult>((resolve) => {
    const child = spawn(cmd, args, {
      timeout,
      cwd: options?.cwd,
      env: { ...process.env, FORCE_COLOR: "0", CI: "1" }
    });

    let stdout = "";
    let stderr = "";
    let buildProgressEmitted = false;

    const timeoutId = setTimeout(() => {
      child.kill("SIGTERM");
    }, timeout);

    if (options?.stdinAnswers && child.stdin && options.stdinAnswers.length > 0) {
      let answerIndex = 0;
      const sendNextAnswer = () => {
        if (answerIndex < options.stdinAnswers!.length && child.stdin) {
          child.stdin.write(options.stdinAnswers![answerIndex] + "\n");
          answerIndex++;
          if (answerIndex < options.stdinAnswers!.length) {
            setTimeout(sendNextAnswer, 3000);
          } else {
            child.stdin.end();
          }
        }
      };
      setTimeout(sendNextAnswer, 5000);
    }

    if (child.stdout) {
      const rlStdout = createInterface({ input: child.stdout, terminal: false });
      rlStdout.on("line", (line) => {
        const text = stripAnsi(stripProgressChars(line));
        if (text) stdout += text + "\n";

        if (options?.onProgress) {
          const trimmed = text.trim();
          if (!trimmed) return;

          const parsed = parseProgress(trimmed);
          if (parsed) {
            options.onProgress(parsed.progress, parsed.message);
          } else if (!buildProgressEmitted && trimmed.length > 10) {
            buildProgressEmitted = true;
            options.onProgress(0, "Building...");
          }
        }
      });
    }

    if (child.stderr) {
      const rlStderr = createInterface({ input: child.stderr, terminal: false });
      rlStderr.on("line", (line) => {
        const text = stripAnsi(stripProgressChars(line));
        if (text) stderr += text + "\n";
      });
    }

    child.on("close", (code) => {
      clearTimeout(timeoutId);
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 1
      });
    });

    child.on("error", (error) => {
      clearTimeout(timeoutId);
      resolve({
        stdout,
        stderr: `${stderr}\n${error.message}`,
        exitCode: 1
      });
    });
  });
}

const BATCH_PHASES = ["Initializing", "Uploading", "Committing"];

export function parseProgress(line: string): { progress: number; message: string } | null {
  const batchMatch = line.match(/\[(\d+)\/(\d+)\]/);
  if (!batchMatch) return null;

  const current = parseInt(batchMatch[1], 10);
  const total = parseInt(batchMatch[2], 10);
  if (total === 0) return null;

  let phaseOffset = 1;
  for (let i = 0; i < BATCH_PHASES.length; i++) {
    if (new RegExp(`\\b${BATCH_PHASES[i]}\\b`).test(line)) {
      phaseOffset = i + 1;
      break;
    }
  }

  const totalSteps = total * BATCH_PHASES.length;
  const completedSteps = (current - 1) * BATCH_PHASES.length + phaseOffset;
  const progress = Math.min(Math.round((completedSteps / totalSteps) * 100), 99);

  const phase = BATCH_PHASES.find((p) => new RegExp(`\\b${p}\\b`).test(line)) ?? "Processing";
  return { progress, message: `${phase} batch ${current}/${total}` };
}

const TRANSIENT_PATTERNS = [
  "timeout",
  "etimedout",
  "econnreset",
  "econnrefused",
  "enotfound",
  "socket hang up",
  "network",
  "rate limit",
  "429",
  "502",
  "503",
  "504"
];

export function isTransientError(result: CliResult): boolean {
  if (result.exitCode === 0) return false;
  const output = `${result.stdout} ${result.stderr}`.toLowerCase();
  return TRANSIENT_PATTERNS.some((pattern) => output.includes(pattern));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function execCommandNonInteractive(
  cmd: string,
  args: string[] = [],
  timeout: number = DEFAULT_TIMEOUT,
  cwd?: string,
  stdinAnswers?: string[]
): Promise<CliResult> {
  return runProcess(cmd, args, timeout, { cwd, stdinAnswers });
}
