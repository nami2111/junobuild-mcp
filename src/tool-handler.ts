import {
  execCli,
  execWithRetry,
  execWithStreaming,
  formatResponse,
  makeProgressCallback
} from "./cli.js";
import { NETWORK_TIMEOUT } from "./constants.js";
import type { GlobalFlags } from "./types.js";

type ExecStrategy = "simple" | "retry" | "streaming";

export interface ToolHandlerConfig {
  command: string;
  subcommand: string;
  label: string;
  argsFromParams?: (params: Record<string, unknown>) => string[];
  hasMode?: boolean;
  timeout?: number;
  strategy?: ExecStrategy;
  getStrategy?: (params: Record<string, unknown>) => ExecStrategy;
}

export function makeToolHandler(config: ToolHandlerConfig) {
  return async (params: Record<string, unknown>, extra?: Record<string, unknown>) => {
    const flags: GlobalFlags | undefined =
      config.hasMode !== false
        ? {
            mode: params.mode as string | undefined,
            profile: params.profile as string | undefined
          }
        : undefined;
    const args = config.argsFromParams?.(params) ?? [];
    const subArgs = config.subcommand ? [config.subcommand, ...args] : args;

    const strategy = config.getStrategy?.(params) ?? config.strategy ?? "simple";
    const timeout = config.timeout ?? NETWORK_TIMEOUT;

    let result: Awaited<ReturnType<typeof execCli>>;

    if (strategy === "streaming") {
      const onProgress = makeProgressCallback(extra);
      if (onProgress) {
        result = await execWithStreaming(config.command, subArgs, flags, timeout, onProgress);
      } else {
        result = await execCli(config.command, subArgs, flags, timeout);
      }
    } else if (strategy === "retry") {
      result = await execWithRetry(config.command, subArgs, flags, timeout);
    } else {
      result = await execCli(config.command, subArgs, flags, timeout);
    }

    const { text, isError } = formatResponse(result, config.label);
    return { content: [{ type: "text" as const, text }], isError };
  };
}
