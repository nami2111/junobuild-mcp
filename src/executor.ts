import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { DEFAULT_TIMEOUT } from "./constants.js";
import type { TraceContext } from "./trace.js";
import { traceEnv } from "./trace.js";
import type { CliResult } from "./types.js";

// biome-ignore lint/suspicious/noControlCharactersInRegex: Intentional - matches ANSI escape codes for stripping
const ANSI_REGEX = /\x1b\[[0-9;]*[a-zA-Z]|\x1b\].*?(?:\x1b\\|\x07)|\r/g;
const UNICODE_SPINNERS =
  /[\u2800-\u28FF\u2713\u2717\u25FC\u25C0\u2728\u{1F4E6}]/gu;
const REPEATED_Z = /^z{2,}$/m;

export function stripAnsi(text: string): string {
  return text.replace(ANSI_REGEX, "").replace(/\r?\n/g, "\n");
}

export function stripProgressChars(text: string): string {
  return text
    .replace(UNICODE_SPINNERS, "")
    .replace(REPEATED_Z, "")
    .replace(/\r?\n/g, "\n");
}

export type ProgressCallback = (progress: number, message: string) => void;
export type LogLevel = "info" | "error";
export type LogCallback = (level: LogLevel, message: string) => void;

export interface StdinConfig {
  answerDelay?: number;
  answers: string[];
  initialDelay?: number;
  prompts?: (string | RegExp)[];
  promptTimeout?: number;
}

const DEFAULT_STDIN_INITIAL_DELAY = 5000;
const DEFAULT_STDIN_ANSWER_DELAY = 3000;
const DEFAULT_STDIN_PROMPT_TIMEOUT = 10_000;

export interface RunProcessOptions {
  cwd?: string;
  onLog?: LogCallback;
  onProgress?: ProgressCallback;
  stdinAnswers?: string[];
  stdinConfig?: StdinConfig;
  trace?: TraceContext;
}

function matchesPrompt(line: string, pattern: string | RegExp): boolean {
  if (typeof pattern === "string") {
    return line.toLowerCase().includes(pattern.toLowerCase());
  }
  return pattern.test(line);
}

interface StdinController {
  onLine: (line: string) => void;
}

function resolveStdinConfig(
  options: RunProcessOptions | undefined
): StdinConfig | undefined {
  if (options?.stdinConfig) {
    return options.stdinConfig;
  }
  if (options?.stdinAnswers && options.stdinAnswers.length > 0) {
    return { answers: options.stdinAnswers };
  }
  return;
}

function setupStdinAutomation(
  child: ReturnType<typeof spawn>,
  options: RunProcessOptions | undefined
): StdinController | undefined {
  const config = resolveStdinConfig(options);
  if (!(config && child.stdin) || config.answers.length === 0) {
    return;
  }

  const { answers } = config;
  const prompts = config.prompts ?? [];
  const initialDelay = config.initialDelay ?? DEFAULT_STDIN_INITIAL_DELAY;
  const answerDelay = config.answerDelay ?? DEFAULT_STDIN_ANSWER_DELAY;
  const promptTimeout = config.promptTimeout ?? DEFAULT_STDIN_PROMPT_TIMEOUT;
  const promptMode = prompts.length > 0;

  let idx = 0;
  let waiting = false;
  let fallbackTimer: NodeJS.Timeout | undefined;

  const clearFallback = (): void => {
    if (fallbackTimer) {
      clearTimeout(fallbackTimer);
      fallbackTimer = undefined;
    }
  };

  const send = (): void => {
    if (idx >= answers.length || !child.stdin) {
      return;
    }
    waiting = false;
    clearFallback();
    child.stdin.write(`${answers[idx]}\n`);
    idx++;
    if (idx >= answers.length) {
      child.stdin.end();
      return;
    }
    if (promptMode) {
      waiting = true;
      fallbackTimer = setTimeout(send, promptTimeout);
    } else {
      setTimeout(send, answerDelay);
    }
  };

  if (promptMode) {
    waiting = true;
    fallbackTimer = setTimeout(send, promptTimeout);
  } else {
    setTimeout(send, initialDelay);
  }

  return {
    onLine: (line: string): void => {
      if (!waiting) {
        return;
      }
      const promptIdx = Math.min(idx, prompts.length - 1);
      const pattern = prompts[promptIdx];
      if (!pattern) {
        return;
      }
      if (matchesPrompt(line, pattern)) {
        send();
      }
    },
  };
}

function handleProgress(
  text: string,
  options: RunProcessOptions | undefined,
  getEmitted: () => boolean,
  setEmitted: (v: boolean) => void
): void {
  if (!options?.onProgress) {
    return;
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return;
  }

  const parsed = parseProgress(trimmed);
  if (parsed) {
    options.onProgress(parsed.progress, parsed.message);
  } else if (!getEmitted() && trimmed.length > 10) {
    setEmitted(true);
    options.onProgress(0, "Building...");
  }
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
      env: {
        ...process.env,
        FORCE_COLOR: "0",
        CI: "1",
        ...traceEnv(options?.trace),
      },
    });

    let stdout = "";
    let stderr = "";
    let buildProgressEmitted = false;
    let processExited = false;

    const timeoutId = setTimeout(() => {
      if (!processExited) {
        child.kill("SIGTERM");

        setTimeout(() => {
          if (!processExited) {
            console.error(
              "[WARN] Process did not respond to SIGTERM, sending SIGKILL"
            );
            child.kill("SIGKILL");
          }
        }, 2000);
      }
    }, timeout);

    const stdinController = setupStdinAutomation(child, options);

    if (child.stdout) {
      const rlStdout = createInterface({
        input: child.stdout,
        terminal: false,
      });
      const onStdoutLine = (line: string) => {
        const text = stripAnsi(stripProgressChars(line));
        if (text) {
          stdout += `${text}\n`;
          options?.onLog?.("info", text);
        }
        stdinController?.onLine(text);
        handleProgress(
          text,
          options,
          () => buildProgressEmitted,
          (v) => {
            buildProgressEmitted = v;
          }
        );
      };
      rlStdout.on("line", onStdoutLine);
    }

    if (child.stderr) {
      const rlStderr = createInterface({
        input: child.stderr,
        terminal: false,
      });
      rlStderr.on("line", (line) => {
        const text = stripAnsi(stripProgressChars(line));
        if (text) {
          stderr += `${text}\n`;
          options?.onLog?.("error", text);
        }
        stdinController?.onLine(text);
      });
    }

    child.on("close", (code) => {
      processExited = true;
      clearTimeout(timeoutId);
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 1,
      });
    });

    child.on("error", (error) => {
      processExited = true;
      clearTimeout(timeoutId);
      resolve({
        stdout,
        stderr: `${stderr}\n${error.message}`,
        exitCode: 1,
      });
    });
  });
}

const BATCH_PHASES = ["Initializing", "Uploading", "Committing"];

const BATCH_PATTERN = /\[(\d+)\/(\d+)\]/;

function findPhase(line: string): string | undefined {
  return BATCH_PHASES.find((p) => new RegExp(`\\b${p}\\b`).test(line));
}

export function parseProgress(
  line: string
): { progress: number; message: string } | null {
  const batchMatch = line.match(BATCH_PATTERN);
  if (!batchMatch) {
    return null;
  }

  const current = Number.parseInt(batchMatch[1], 10);
  const total = Number.parseInt(batchMatch[2], 10);
  if (total === 0) {
    return null;
  }

  let phaseOffset = 1;
  for (let i = 0; i < BATCH_PHASES.length; i++) {
    if (new RegExp(`\\b${BATCH_PHASES[i]}\\b`).test(line)) {
      phaseOffset = i + 1;
      break;
    }
  }

  const totalSteps = total * BATCH_PHASES.length;
  const completedSteps = (current - 1) * BATCH_PHASES.length + phaseOffset;
  const progress = Math.min(
    Math.round((completedSteps / totalSteps) * 100),
    99
  );

  const phase = findPhase(line) ?? "Processing";
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
  "504",
];

export function isTransientError(result: CliResult): boolean {
  if (result.exitCode === 0) {
    return false;
  }
  const output = `${result.stdout} ${result.stderr}`.toLowerCase();
  return TRANSIENT_PATTERNS.some((pattern) => output.includes(pattern));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function execCommandNonInteractive(
  cmd: string,
  args: string[] = [],
  timeout: number = DEFAULT_TIMEOUT,
  cwd?: string,
  stdinAnswers?: string[]
): Promise<CliResult> {
  return runProcess(cmd, args, timeout, { cwd, stdinAnswers });
}
