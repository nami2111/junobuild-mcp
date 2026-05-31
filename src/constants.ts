const DEFAULT_CHARACTER_LIMIT = 25_000;
const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_NETWORK_TIMEOUT_MS = 300_000;

export function parseEnvNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

export const CHARACTER_LIMIT = parseEnvNumber(
  "JUNO_MCP_CHAR_LIMIT",
  DEFAULT_CHARACTER_LIMIT
);

export const DEFAULT_TIMEOUT = parseEnvNumber(
  "JUNO_MCP_TIMEOUT",
  DEFAULT_TIMEOUT_MS
);

export const NETWORK_TIMEOUT = parseEnvNumber(
  "JUNO_MCP_NETWORK_TIMEOUT",
  DEFAULT_NETWORK_TIMEOUT_MS
);

export const CLI_PACKAGE = "@junobuild/cli";
export const MIN_CLI_VERSION = "0.0.50";
