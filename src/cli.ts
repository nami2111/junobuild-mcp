import { exec } from "node:child_process";
import { CHARACTER_LIMIT, CLI_PACKAGE, DEFAULT_TIMEOUT } from "./constants.js";
import type { ProgressCallback } from "./executor.js";
import { isTransientError, runProcess, sleep, stripAnsi } from "./executor.js";
import { buildJunoContextArgs } from "./juno-context.js";
import type { CliResult, GlobalFlags } from "./types.js";

export function buildFlagArgs(flags?: GlobalFlags): string[] {
  return buildJunoContextArgs(flags);
}

let cachedCliPath: string | null = null;

async function resolveCliPath(): Promise<string> {
  if (cachedCliPath) {
    return cachedCliPath;
  }

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

export function resetCliPathCache(): void {
  cachedCliPath = null;
}

async function resolveCliParts(): Promise<{ cmd: string; args: string[] }> {
  const path = await resolveCliPath();
  if (path.includes(" ")) {
    const [cmd, ...args] = path.split(" ");
    return { cmd, args };
  }
  return { cmd: path, args: [] };
}

export async function execCli(
  command: string,
  args: string[] = [],
  flags?: GlobalFlags,
  timeout: number = DEFAULT_TIMEOUT
): Promise<CliResult> {
  const { cmd: cliCmd, args: cliArgs } = await resolveCliParts();
  const flagArgs = buildFlagArgs(flags);
  const allArgs = [...cliArgs, command, ...flagArgs, ...args];
  return runProcess(cliCmd, allArgs, timeout);
}

export function execCommand(
  cmd: string,
  timeout: number = DEFAULT_TIMEOUT
): Promise<CliResult> {
  return new Promise<CliResult>((resolve) => {
    exec(
      cmd,
      { timeout, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        resolve({
          stdout: stripAnsi(stdout ?? ""),
          stderr: stripAnsi(stderr ?? ""),
          exitCode: error ? 1 : 0,
        });
      }
    );
  });
}

export async function execWithRetry(
  command: string,
  args: string[] = [],
  flags?: GlobalFlags,
  timeout: number = DEFAULT_TIMEOUT,
  maxRetries = 3,
  baseDelay = 1000
): Promise<CliResult> {
  let lastResult: CliResult | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = baseDelay * 2 ** (attempt - 1);
      await sleep(delay);
    }

    lastResult = await execCli(command, args, flags, timeout);

    if (lastResult.exitCode === 0 || !isTransientError(lastResult)) {
      return lastResult;
    }
  }

  return lastResult ?? { stdout: "", stderr: "", exitCode: 1 };
}

export async function execWithStreaming(
  command: string,
  args: string[] = [],
  flags?: GlobalFlags,
  timeout: number = DEFAULT_TIMEOUT,
  onProgress?: ProgressCallback
): Promise<CliResult> {
  const { cmd: cliCmd, args: cliArgs } = await resolveCliParts();
  const flagArgs = buildFlagArgs(flags);
  const allArgs = [...cliArgs, command, ...flagArgs, ...args];
  return runProcess(cliCmd, allArgs, timeout, { onProgress });
}

export function makeProgressCallback(
  extra: unknown
): ProgressCallback | undefined {
  const e = extra as {
    _meta?: Record<string, unknown>;
    sendNotification: (n: unknown) => Promise<void>;
  };
  const token = e._meta?.progressToken as string | number | undefined;
  if (!token) {
    return;
  }

  return (progress: number, message: string) => {
    e.sendNotification({
      method: "notifications/progress",
      params: { progressToken: token, progress, total: 100, message },
    }).catch(() => {
      // Intentionally consumed - fire-and-forget notification
    });
  };
}

export function formatResponse(
  result: CliResult,
  label?: string
): { text: string; isError: boolean } {
  const parts: string[] = [];
  if (label) {
    parts.push(`## ${label}\n`);
  }

  const stdout = stripAnsi(result.stdout).trim();
  const stderr = stripAnsi(result.stderr).trim();

  if (result.exitCode === 0) {
    if (stdout) {
      parts.push(stdout);
    }
    if (stderr) {
      parts.push(`\n**Warnings:**\n${stderr}`);
    }
  } else {
    parts.push(`**Error (exit code ${result.exitCode})**`);
    if (stderr) {
      parts.push(stderr);
    } else if (stdout) {
      parts.push(stdout);
    }
  }

  const text = parts.join("\n");
  return {
    text:
      text.length > CHARACTER_LIMIT
        ? `${text.slice(0, CHARACTER_LIMIT)}\n...(truncated)`
        : text,
    isError: result.exitCode !== 0,
  };
}
