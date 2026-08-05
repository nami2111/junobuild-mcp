import { exec } from "node:child_process";
import type { ServerContext } from "@modelcontextprotocol/server";
import {
  CHARACTER_LIMIT,
  CLI_PACKAGE,
  DEFAULT_TIMEOUT,
  MIN_CLI_VERSION,
} from "./constants.js";
import { parseCliError } from "./error-parser.js";
import type { LogCallback, ProgressCallback } from "./executor.js";
import { isTransientError, runProcess, sleep, stripAnsi } from "./executor.js";
import { buildJunoContextArgs } from "./juno-context.js";
import type { CliResult, GlobalFlags } from "./types.js";

export function buildFlagArgs(flags?: GlobalFlags): string[] {
  return buildJunoContextArgs(flags);
}

function isDebugEnabled(): boolean {
  return process.env.JUNO_MCP_DEBUG === "true" || process.env.DEBUG === "true";
}

export function debugLog(context: string, error: unknown): void {
  if (!isDebugEnabled()) {
    return;
  }
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[DEBUG] ${context}: ${message}`);
}

let cachedCliPath: string | null = null;
let cachedCliVersion: string | null = null;

const CLI_VERSION_REGEX = /(\d+\.\d+\.\d+)/;
let versionCheckSkipped = false;

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
  } catch (error) {
    debugLog("resolveCliPath fell back to npx", error);
    cachedCliPath = `npx ${CLI_PACKAGE}`;
    return cachedCliPath;
  }
}

export function resetCliPathCache(): void {
  cachedCliPath = null;
  cachedCliVersion = null;
  versionCheckSkipped = false;
}

function compareVersions(version: string, minVersion: string): boolean {
  const v1Parts = version.split(".").map((n) => Number.parseInt(n, 10));
  const v2Parts = minVersion.split(".").map((n) => Number.parseInt(n, 10));

  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1 = v1Parts[i] || 0;
    const v2 = v2Parts[i] || 0;
    if (v1 > v2) {
      return true;
    }
    if (v1 < v2) {
      return false;
    }
  }
  return true;
}

async function checkCliVersion(): Promise<void> {
  if (cachedCliVersion || versionCheckSkipped) {
    return;
  }

  if (process.env.JUNO_SKIP_VERSION_CHECK === "true") {
    versionCheckSkipped = true;
    return;
  }

  try {
    const { cmd: cliCmd, args: cliArgs } = await resolveCliParts();
    const result = await runProcess(cliCmd, [...cliArgs, "--version"], 5000);

    if (result.exitCode === 0) {
      const versionMatch = result.stdout.match(CLI_VERSION_REGEX);
      if (versionMatch) {
        const version = versionMatch[1];
        cachedCliVersion = version;

        if (!compareVersions(version, MIN_CLI_VERSION)) {
          throw new Error(
            `Juno CLI version ${version} is too old. Minimum required: ${MIN_CLI_VERSION}. Run: npm install -g ${CLI_PACKAGE}@latest`
          );
        }
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("too old")) {
      throw error;
    }
    debugLog("checkCliVersion skipped due to error", error);
    versionCheckSkipped = true;
  }
}

export async function resolveCliParts(): Promise<{ cmd: string; args: string[] }> {
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
  await checkCliVersion();
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
  baseDelay = 1000,
  maxDelay = 8000
): Promise<CliResult> {
  let lastResult: CliResult | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(baseDelay * 2 ** (attempt - 1), maxDelay);
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
  onProgress?: ProgressCallback,
  onLog?: LogCallback
): Promise<CliResult> {
  const { cmd: cliCmd, args: cliArgs } = await resolveCliParts();
  const flagArgs = buildFlagArgs(flags);
  const allArgs = [...cliArgs, command, ...flagArgs, ...args];
  return runProcess(cliCmd, allArgs, timeout, { onProgress, onLog });
}

export function makeProgressCallback(
  ctx: ServerContext
): ProgressCallback | undefined {
  const token = ctx.mcpReq._meta?.progressToken;
  if (!token) {
    return;
  }

  return (progress: number, message: string) => {
    ctx.mcpReq
      .notify({
        method: "notifications/progress",
        params: { progressToken: token, progress, total: 100, message },
      })
      .catch((error) => {
        debugLog("progress notification failed", error);
      });
  };
}

export function makeLogCallback(
  ctx: ServerContext,
  logger?: string
): LogCallback {
  return (level, message) => {
    // ctx.mcpReq.log is gated by the SDK: per-request _meta.logLevel on
    // 2026-07-28 (absent = silently opt-out), logging/setLevel on legacy.
    ctx.mcpReq.log(level, message, logger).catch((error) => {
      debugLog("log notification failed", error);
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
    const parsedError = parseCliError(stderr, stdout, result.exitCode);

    if (parsedError) {
      parts.push(`**Error (${parsedError.type})**`);
      parts.push(parsedError.message);
      parts.push(`\n**Suggestion:** ${parsedError.suggestion}`);
    } else {
      parts.push(`**Error (exit code ${result.exitCode})**`);
      if (stderr) {
        parts.push(stderr);
      } else if (stdout) {
        parts.push(stdout);
      }
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
