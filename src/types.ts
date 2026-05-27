import type { JunoContext } from "./juno-context.js";

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export type GlobalFlags = JunoContext;

export interface ToolResponse {
  content: { type: "text"; text: string }[];
  isError?: boolean;
}
