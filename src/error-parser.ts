const ERROR_PREFIX_REGEX = /^Error:\s*/;

export interface ParsedError {
  message: string;
  suggestion: string;
  type: ErrorType;
}

export type ErrorType =
  | "auth"
  | "network"
  | "config"
  | "not_found"
  | "permission"
  | "unknown";

interface ErrorPattern {
  pattern: RegExp;
  suggestion: string;
  type: ErrorType;
}

const ERROR_PATTERNS: readonly ErrorPattern[] = [
  {
    pattern:
      /not authenticated|authentication failed|invalid token|unauthorized/i,
    type: "auth",
    suggestion: "Run `juno login` or set JUNO_TOKEN environment variable.",
  },
  {
    pattern: /satellite not found|module not found|no satellite/i,
    type: "not_found",
    suggestion:
      "Check satellite ID in juno.config or use --mode/--profile flags.",
  },
  {
    pattern: /config.*not found|juno\.config.*missing|no configuration/i,
    type: "config",
    suggestion:
      "Run `juno config init` to create juno.config.ts in project root.",
  },
  {
    pattern: /permission denied|forbidden|access denied/i,
    type: "permission",
    suggestion: "Verify you have required permissions for this satellite.",
  },
  {
    pattern:
      /network error|timeout|etimedout|econnreset|econnrefused|enotfound|socket hang up/i,
    type: "network",
    suggestion: "Check network connection. Retry with --retry flag.",
  },
  {
    pattern: /rate limit|429|too many requests/i,
    type: "network",
    suggestion: "Rate limited. Wait before retrying.",
  },
  {
    pattern: /502|503|504|bad gateway|service unavailable|gateway timeout/i,
    type: "network",
    suggestion: "Service temporarily unavailable. Retry in a few moments.",
  },
];

export function parseCliError(
  stderr: string,
  stdout: string,
  exitCode: number
): ParsedError | null {
  if (exitCode === 0) {
    return null;
  }

  const output = `${stderr} ${stdout}`.toLowerCase();

  for (const { pattern, type, suggestion } of ERROR_PATTERNS) {
    if (pattern.test(output)) {
      return {
        type,
        message: extractErrorMessage(stderr, stdout),
        suggestion,
      };
    }
  }

  return null;
}

function extractErrorMessage(stderr: string, stdout: string): string {
  const text = stderr.trim() || stdout.trim();
  const lines = text.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("at ") && trimmed.length > 10) {
      return trimmed.replace(ERROR_PREFIX_REGEX, "");
    }
  }

  return text.slice(0, 200);
}
