export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface GlobalFlags {
  mode?: string;
  profile?: string;
}

export interface ToolResponse {
  content: { type: "text"; text: string }[];
  isError?: boolean;
}
