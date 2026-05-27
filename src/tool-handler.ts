import {
  execCli,
  execWithRetry,
  execWithStreaming,
  formatResponse,
  makeProgressCallback,
} from "./cli.js";
import { NETWORK_TIMEOUT } from "./constants.js";
import {
  type JunoContextCapability,
  modeProfileContext,
  pickJunoContext,
} from "./juno-context.js";
import type { GlobalFlags } from "./types.js";

type ExecStrategy = "simple" | "retry" | "streaming";

export interface ToolHandlerConfig {
  argsFromParams?: (params: Record<string, unknown>) => string[];
  command: string;
  context?: readonly JunoContextCapability[] | false;
  getStrategy?: (params: Record<string, unknown>) => ExecStrategy;
  hasMode?: boolean;
  label: string;
  strategy?: ExecStrategy;
  subcommand: string;
  timeout?: number;
}

export function makeToolHandler(config: ToolHandlerConfig) {
  return async (
    params: Record<string, unknown>,
    extra?: Record<string, unknown>
  ) => {
    const contextCapabilities =
      config.context === false || config.hasMode === false
        ? undefined
        : (config.context ?? modeProfileContext);
    const flags: GlobalFlags | undefined = contextCapabilities
      ? pickJunoContext(params, contextCapabilities)
      : undefined;
    const args = config.argsFromParams?.(params) ?? [];
    const subArgs = config.subcommand ? [config.subcommand, ...args] : args;

    const strategy =
      config.getStrategy?.(params) ?? config.strategy ?? "simple";
    const timeout = config.timeout ?? NETWORK_TIMEOUT;

    let result: Awaited<ReturnType<typeof execCli>>;

    if (strategy === "streaming") {
      const onProgress = makeProgressCallback(extra);
      if (onProgress) {
        result = await execWithStreaming(
          config.command,
          subArgs,
          flags,
          timeout,
          onProgress
        );
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
