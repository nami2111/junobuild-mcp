import { exec } from "node:child_process";
import type { CliResult, GlobalFlags } from "./types.js";
import { CLI_PACKAGE, DEFAULT_TIMEOUT, CHARACTER_LIMIT } from "./constants.js";

const ANSI_REGEX = /\x1b\[[0-9;]*[a-zA-Z]|\x1b\].*?(?:\x1b\\|\x07)|\r/g;

function stripAnsi(text: string): string {
  return text.replace(ANSI_REGEX, "").replace(/\r?\n/g, "\n");
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
