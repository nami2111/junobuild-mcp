import type { JunoContext } from "./juno-context.js";

export interface CliResult {
  exitCode: number;
  stderr: string;
  stdout: string;
}

export type GlobalFlags = JunoContext;

export interface ToolResponse {
  content: { type: "text"; text: string }[];
  isError?: boolean;
}
