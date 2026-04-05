import { exec } from "node:child_process";
import { spawn } from "node:child_process";
import type { CliResult, GlobalFlags } from "./types.js";
import { CLI_PACKAGE, DEFAULT_TIMEOUT, CHARACTER_LIMIT } from "./constants.js";

const ANSI_REGEX = /\x1b\[[0-9;]*[a-zA-Z]|\x1b\].*?(?:\x1b\\|\x07)|\r/g;
const UNICODE_SPINNERS = /[\u2800-\u28FF\u2713\u2717\u25FC\u25C0\u2728\uD83D\uDCE6]/g;
const REPEATED_Z = /^z{2,}$/m;

function stripAnsi(text: string): string {
  return text.replace(ANSI_REGEX, "").replace(/\r?\n/g, "\n");
}

export function stripProgressChars(text: string): string {
  return text.replace(UNICODE_SPINNERS, "").replace(REPEATED_Z, "").replace(/\r?\n/g, "\n");
}

function buildFlags(flags?: GlobalFlags): string {
  const parts: string[] = [];
  if (flags?.mode) parts.push(`--mode ${flags.mode}`);
  if (flags?.profile) parts.push(`--profile ${flags.profile}`);
  return parts.length > 0 ? " " + parts.join(" ") : "";
}

let cachedCliPath: string | null = null;

async function resolveCliPath(): Promise<string> {
  if (cachedCliPath) return cachedCliPath;

  try {
    const result = await new Promise<string>((resolve, reject) => {
      exec("which juno", { timeout: 5000 }, (error, stdout) => {
        if (error || !stdout.trim()) {
          reject(new Error("juno not found in PATH"));
        } else {
          resolve(stdout.trim());
        }
      });
    });
    cachedCliPath = result;
    return result;
  } catch {
    cachedCliPath = `npx ${CLI_PACKAGE}`;
    return cachedCliPath;
  }
}

export async function execCli(
  command: string,
  args: string[] = [],
  flags?: GlobalFlags,
  timeout: number = DEFAULT_TIMEOUT
): Promise<CliResult> {
  const flagStr = buildFlags(flags);
  const cliPath = await resolveCliPath();
  const cmd = `${cliPath} ${command}${flagStr} ${args.join(" ")}`.trim();

  return execCommand(cmd, timeout);
}

export async function execCommand(
  cmd: string,
  timeout: number = DEFAULT_TIMEOUT
): Promise<CliResult> {
  return new Promise<CliResult>((resolve) => {
    exec(cmd, { timeout, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      resolve({
        stdout: stripAnsi(stdout ?? ""),
        stderr: stripAnsi(stderr ?? ""),
        exitCode: error ? 1 : 0
      });
    });
  });
}

export async function execCommandNonInteractive(
  cmd: string,
  timeout: number = DEFAULT_TIMEOUT,
  cwd?: string,
  stdinAnswers?: string[]
): Promise<CliResult> {
  return new Promise<CliResult>((resolve) => {
    const [cmdPart, ...cmdArgs] = cmd.split(" ");
    const child = spawn(cmdPart, cmdArgs, {
      timeout,
      stdio: stdinAnswers ? ["pipe", "pipe", "pipe"] : ["ignore", "pipe", "pipe"],
      cwd,
      env: { ...process.env, FORCE_COLOR: "0", CI: "1" }
    });

    let stdout = "";
    let stderr = "";

    const timeoutId = setTimeout(() => {
      child.kill("SIGTERM");
    }, timeout);

    if (stdinAnswers && child.stdin && stdinAnswers.length > 0) {
      let answerIndex = 0;
      const sendNextAnswer = () => {
        if (answerIndex < stdinAnswers.length && child.stdin) {
          child.stdin.write(stdinAnswers[answerIndex] + "\n");
          answerIndex++;
          if (answerIndex < stdinAnswers.length) {
            setTimeout(sendNextAnswer, 3000);
          } else {
            child.stdin.end();
          }
        }
      };
      setTimeout(sendNextAnswer, 5000);
    }

    child.stdout?.on("data", (data: Buffer) => {
      stdout += stripAnsi(data.toString());
    });

    child.stderr?.on("data", (data: Buffer) => {
      stderr += stripAnsi(data.toString());
    });

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

const TRANSIENT_PATTERNS = [
  "timeout",
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "ENOTFOUND",
  "socket hang up",
  "network",
  "rate limit",
  "429",
  "502",
  "503",
  "504"
];

function isTransientError(result: CliResult): boolean {
  if (result.exitCode === 0) return false;
  const output = `${result.stdout} ${result.stderr}`.toLowerCase();
  return TRANSIENT_PATTERNS.some((pattern) => output.includes(pattern));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function execWithRetry(
  command: string,
  args: string[] = [],
  flags?: GlobalFlags,
  timeout: number = DEFAULT_TIMEOUT,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<CliResult> {
  let lastResult: CliResult | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await sleep(delay);
    }

    lastResult = await execCli(command, args, flags, timeout);

    if (lastResult.exitCode === 0 || !isTransientError(lastResult)) {
      return lastResult;
    }
  }

  return lastResult!;
}

export type ProgressCallback = (progress: number, message: string) => void;

const BATCH_PHASES = ["Initializing", "Uploading", "Committing"];

function parseProgress(line: string): { progress: number; message: string } | null {
  const batchMatch = line.match(/\[(\d+)\/(\d+)\]/);
  if (!batchMatch) return null;

  const current = parseInt(batchMatch[1], 10);
  const total = parseInt(batchMatch[2], 10);
  if (total === 0) return null;

  let phaseOffset = 1;
  for (let i = 0; i < BATCH_PHASES.length; i++) {
    if (line.includes(BATCH_PHASES[i])) {
      phaseOffset = i + 1;
      break;
    }
  }

  const totalSteps = total * BATCH_PHASES.length;
  const completedSteps = (current - 1) * BATCH_PHASES.length + phaseOffset;
  const progress = Math.min(Math.round((completedSteps / totalSteps) * 100), 99);

  const phase = BATCH_PHASES.find((p) => line.includes(p)) ?? "Processing";
  return { progress, message: `${phase} batch ${current}/${total}` };
}

export async function execWithStreaming(
  command: string,
  args: string[] = [],
  flags?: GlobalFlags,
  timeout: number = DEFAULT_TIMEOUT,
  onProgress?: ProgressCallback
): Promise<CliResult> {
  const flagStr = buildFlags(flags);
  const cliPath = await resolveCliPath();
  const cmd = `${cliPath} ${command}${flagStr} ${args.join(" ")}`.trim();

  return new Promise<CliResult>((resolve) => {
    const [cmdPart, ...cmdArgs] = cmd.split(" ");
    const child = spawn(cmdPart, cmdArgs, {
      timeout,
      env: { ...process.env, FORCE_COLOR: "0", CI: "1" }
    });

    let stdout = "";
    let stderr = "";
    let buildProgressEmitted = false;

    const timeoutId = setTimeout(() => {
      child.kill("SIGTERM");
    }, timeout);

    child.stdout?.on("data", (data: Buffer) => {
      const text = stripAnsi(stripProgressChars(data.toString()));
      stdout += text;

      if (onProgress) {
        for (const line of text.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          const parsed = parseProgress(trimmed);
          if (parsed) {
            onProgress(parsed.progress, parsed.message);
          } else if (!buildProgressEmitted && trimmed.length > 10) {
            buildProgressEmitted = true;
            onProgress(0, "Building...");
          }
        }
      }
    });

    child.stderr?.on("data", (data: Buffer) => {
      const text = stripAnsi(stripProgressChars(data.toString()));
      stderr += text;
    });

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

export function formatResponse(result: CliResult, label?: string): { text: string; isError: boolean } {
  const parts: string[] = [];
  if (label) parts.push(`## ${label}\n`);

  const stdout = stripAnsi(result.stdout).trim();
  const stderr = stripAnsi(result.stderr).trim();

  if (result.exitCode !== 0) {
    parts.push(`**Error (exit code ${result.exitCode})**`);
    if (stderr) {
      parts.push(stderr);
    } else if (stdout) {
      parts.push(stdout);
    }
  } else {
    if (stdout) parts.push(stdout);
    if (stderr) parts.push(`\n**Warnings:**\n${stderr}`);
  }

  const text = parts.join("\n");
  return {
    text: text.length > CHARACTER_LIMIT ? text.slice(0, CHARACTER_LIMIT) + "\n...(truncated)" : text,
    isError: result.exitCode !== 0
  };
}
