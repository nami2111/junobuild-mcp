import type { ServerContext } from "@modelcontextprotocol/server";
import {
  execCli,
  execWithRetry,
  execWithStreaming,
  formatResponse,
  makeLogCallback,
  makeProgressCallback,
  makeTraceLogger,
} from "./cli.js";
import { NETWORK_TIMEOUT } from "./constants.js";
import {
  type JunoContextCapability,
  modeProfileContext,
  pickJunoContext,
} from "./juno-context.js";
import type { GlobalFlags } from "./types.js";

type ExecStrategy = "simple" | "retry" | "streaming";

export interface RetryConfig {
  baseDelay: number;
  maxDelay: number;
  maxRetries: number;
}

export interface ToolHandlerConfig {
  argsFromParams?: (params: Record<string, unknown>) => string[];
  command: string;
  context?: readonly JunoContextCapability[] | false;
  getStrategy?: (params: Record<string, unknown>) => ExecStrategy;
  hasMode?: boolean;
  label: string;
  retryConfig?: RetryConfig;
  strategy?: ExecStrategy;
  subcommand: string;
  timeout?: number;
}

async function execByStrategy(
  config: ToolHandlerConfig,
  params: Record<string, unknown>,
  subArgs: string[],
  flags: GlobalFlags | undefined,
  timeout: number,
  ctx: ServerContext
): Promise<Awaited<ReturnType<typeof execCli>>> {
  const strategy = config.getStrategy?.(params) ?? config.strategy ?? "simple";
  const trace = makeTraceLogger(ctx);

  if (strategy === "streaming") {
    const onProgress = makeProgressCallback(ctx);
    const onLog = params.streamLogs
      ? makeLogCallback(ctx, `juno_${config.command}`)
      : undefined;
    if (onProgress || onLog) {
      return await execWithStreaming(
        config.command,
        subArgs,
        flags,
        timeout,
        onProgress,
        onLog,
        trace
      );
    }
    return execCli(config.command, subArgs, flags, timeout, trace);
  }

  if (strategy === "retry") {
    const retryConfig = config.retryConfig ?? {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 8000,
    };
    const maxRetries =
      typeof params.maxRetries === "number"
        ? params.maxRetries
        : retryConfig.maxRetries;
    return execWithRetry(
      config.command,
      subArgs,
      flags,
      timeout,
      maxRetries,
      retryConfig.baseDelay,
      retryConfig.maxDelay,
      trace
    );
  }

  return execCli(config.command, subArgs, flags, timeout, trace);
}

export function makeToolHandler(config: ToolHandlerConfig) {
  return async (params: Record<string, unknown>, ctx: ServerContext) => {
    const contextCapabilities =
      config.context === false || config.hasMode === false
        ? undefined
        : (config.context ?? modeProfileContext);
    const flags: GlobalFlags | undefined = contextCapabilities
      ? pickJunoContext(params, contextCapabilities)
      : undefined;
    const args = config.argsFromParams?.(params) ?? [];
    const subArgs = config.subcommand ? [config.subcommand, ...args] : args;
    const timeout = config.timeout ?? NETWORK_TIMEOUT;

    const result = await execByStrategy(
      config,
      params,
      subArgs,
      flags,
      timeout,
      ctx
    );

    const { text, isError } = formatResponse(result, config.label);
    return { content: [{ type: "text" as const, text }], isError };
  };
}
