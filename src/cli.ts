import { exec } from "node:child_process";
import type { CliResult, GlobalFlags } from "./types.js";
import { CLI_PACKAGE, DEFAULT_TIMEOUT } from "./constants.js";

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

export async function execCli(
  command: string,
  args: string[] = [],
  flags?: GlobalFlags,
  timeout: number = DEFAULT_TIMEOUT
): Promise<CliResult> {
  const flagStr = buildFlags(flags);
  const cmd = `npx ${CLI_PACKAGE} ${command}${flagStr} ${args.join(" ")}`.trim();

  return new Promise<CliResult>((resolve) => {
    exec(cmd, { timeout, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      resolve({
        stdout: stdout ?? "",
        stderr: stderr ?? "",
        exitCode: error ? 1 : 0
      });
    });
  });
}

export function formatResponse(result: CliResult, label?: string): string {
  const parts: string[] = [];
  if (label) parts.push(`## ${label}\n`);
  if (result.stdout) parts.push(stripAnsi(result.stdout).trim());
  if (result.stderr) parts.push(`\n**Stderr:**\n${stripAnsi(result.stderr).trim()}`);
  if (result.exitCode !== 0) parts.push(`\n**Exit code:** ${result.exitCode}`);
  const text = parts.join("\n");
  return text.length > 25000 ? text.slice(0, 25000) + "\n...(truncated)" : text;
}
