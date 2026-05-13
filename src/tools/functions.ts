import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  execCli,
  execWithRetry,
  execWithStreaming,
  formatResponse,
  makeProgressCallback
} from "../cli.js";
import {
  functionsBuildSchema,
  functionsEjectSchema,
  functionsPublishSchema,
  functionsUpgradeSchema
} from "../schemas/functions.js";
import { NETWORK_TIMEOUT } from "../constants.js";
import type { GlobalFlags } from "../types.js";

export function buildFunctionsBuildArgs(params: {
  lang?: string;
  cargoPath?: string;
  sourcePath?: string;
  watch?: boolean;
}): string[] {
  const args: string[] = [];
  if (params.lang) args.push("-l", params.lang);
  if (params.cargoPath) args.push("--cargo-path", params.cargoPath);
  if (params.sourcePath) args.push("--source-path", params.sourcePath);
  if (params.watch) args.push("--watch");
  return args;
}

export function buildFunctionsEjectArgs(params: { lang?: string }): string[] {
  const args: string[] = [];
  if (params.lang) args.push("-l", params.lang);
  return args;
}

export function buildFunctionsPublishArgs(params: {
  src?: string;
  noApply?: boolean;
  keepStaged?: boolean;
  retry?: boolean;
  progress?: boolean;
}): string[] {
  const args: string[] = [];
  if (params.src) args.push("-s", params.src);
  if (params.noApply) args.push("--no-apply");
  if (params.keepStaged) args.push("-k");
  return args;
}

export function buildFunctionsUpgradeArgs(params: {
  src?: string;
  cdn?: boolean;
  cdnPath?: string;
  clearChunks?: boolean;
  noSnapshot?: boolean;
  reset?: boolean;
  retry?: boolean;
  progress?: boolean;
}): string[] {
  const args: string[] = [];
  if (params.src) args.push("-s", params.src);
  if (params.cdn) args.push("--cdn");
  if (params.cdnPath) args.push("--cdn-path", params.cdnPath);
  if (params.clearChunks) args.push("--clear-chunks");
  if (params.noSnapshot) args.push("--no-snapshot");
  if (params.reset) args.push("-r");
  return args;
}

export async function handleFunctionsBuild(
  params: Record<string, unknown>
): Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }> {
  const args = buildFunctionsBuildArgs(params as { lang?: string; cargoPath?: string; sourcePath?: string; watch?: boolean });
  const result = await execCli("functions", ["build", ...args], undefined, NETWORK_TIMEOUT);
  const { text, isError } = formatResponse(result, "Functions Build");
  return { content: [{ type: "text", text }], isError };
}

export async function handleFunctionsEject(
  params: Record<string, unknown>
): Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }> {
  const args = buildFunctionsEjectArgs(params as { lang?: string });
  const result = await execCli("functions", ["eject", ...args], undefined, NETWORK_TIMEOUT);
  const { text, isError } = formatResponse(result, "Functions Eject");
  return { content: [{ type: "text", text }], isError };
}

export async function handleFunctionsPublish(
  params: Record<string, unknown>,
  extra?: Record<string, unknown>
): Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }> {
  const flags: GlobalFlags = { mode: params.mode as string | undefined, profile: params.profile as string | undefined };
  const args = buildFunctionsPublishArgs(params as { src?: string; noApply?: boolean; keepStaged?: boolean; retry?: boolean; progress?: boolean });

  const onProgress = params.progress ? makeProgressCallback(extra) : undefined;
  let result: Awaited<ReturnType<typeof execCli>>;

  if (onProgress) {
    result = await execWithStreaming(
      "functions",
      ["publish", ...args],
      flags,
      NETWORK_TIMEOUT,
      onProgress
    );
  } else if (params.retry) {
    result = await execWithRetry("functions", ["publish", ...args], flags, NETWORK_TIMEOUT);
  } else {
    result = await execCli("functions", ["publish", ...args], flags, NETWORK_TIMEOUT);
  }

  const { text, isError } = formatResponse(result, "Functions Publish");
  return { content: [{ type: "text", text }], isError };
}

export async function handleFunctionsUpgrade(
  params: Record<string, unknown>,
  extra?: Record<string, unknown>
): Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }> {
  const flags: GlobalFlags = { mode: params.mode as string | undefined, profile: params.profile as string | undefined };
  const args = buildFunctionsUpgradeArgs(params as { src?: string; cdn?: boolean; cdnPath?: string; clearChunks?: boolean; noSnapshot?: boolean; reset?: boolean; retry?: boolean; progress?: boolean });

  const onProgress = params.progress ? makeProgressCallback(extra) : undefined;
  let result: Awaited<ReturnType<typeof execCli>>;

  if (onProgress) {
    result = await execWithStreaming(
      "functions",
      ["upgrade", ...args],
      flags,
      NETWORK_TIMEOUT,
      onProgress
    );
  } else if (params.retry) {
    result = await execWithRetry("functions", ["upgrade", ...args], flags, NETWORK_TIMEOUT);
  } else {
    result = await execCli("functions", ["upgrade", ...args], flags, NETWORK_TIMEOUT);
  }

  const { text, isError } = formatResponse(result, "Functions Upgrade");
  return { content: [{ type: "text", text }], isError };
}

export function registerFunctionsTools(server: McpServer): void {
  server.registerTool(
    "juno_functions_build",
    {
      title: "Juno Functions Build",
      description:
        "Build your serverless functions. Supports Rust, TypeScript, and JavaScript. The CLI auto-detects the language if not specified.",
      inputSchema: functionsBuildSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async (params) => handleFunctionsBuild(params as Record<string, unknown>)
  );

  server.registerTool(
    "juno_functions_eject",
    {
      title: "Juno Functions Eject",
      description:
        "Generate the required files to begin developing serverless functions in your project. Scaffolds boilerplate for Rust, TypeScript, or JavaScript functions. Alias: `juno functions init`.",
      inputSchema: functionsEjectSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params) => handleFunctionsEject(params as Record<string, unknown>)
  );

  server.registerTool(
    "juno_functions_publish",
    {
      title: "Juno Functions Publish",
      description:
        "Publish a new version of your serverless functions to the satellite. Optionally submit as a pending change without applying, or provide a custom WASM file path.",
      inputSchema: functionsPublishSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params, extra) => handleFunctionsPublish(params as Record<string, unknown>, extra)
  );

  server.registerTool(
    "juno_functions_upgrade",
    {
      title: "Juno Functions Upgrade",
      description:
        "Upgrade your satellite's serverless functions. Can use a local WASM file, select from CDN releases, or use the default local build output. Optionally create a snapshot before upgrading.",
      inputSchema: functionsUpgradeSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params, extra) => handleFunctionsUpgrade(params as Record<string, unknown>, extra)
  );
}
