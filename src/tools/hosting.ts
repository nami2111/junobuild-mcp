import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  execCli,
  execWithRetry,
  execWithStreaming,
  formatResponse,
  makeProgressCallback
} from "../cli.js";
import { hostingDeploySchema, hostingClearSchema, hostingPruneSchema } from "../schemas/hosting.js";
import { NETWORK_TIMEOUT } from "../constants.js";
import type { GlobalFlags } from "../types.js";

export function buildHostingDeployArgs(params: {
  batch: number;
  clear?: boolean;
  prune?: boolean;
  immediate?: boolean;
  keepStaged?: boolean;
  noApply?: boolean;
  config?: boolean;
  retry?: boolean;
  progress?: boolean;
}): string[] {
  const args: string[] = [];
  args.push("--batch", String(params.batch));
  if (params.clear) args.push("--clear");
  if (params.prune) args.push("--prune");
  if (params.immediate) args.push("-i");
  if (params.keepStaged) args.push("-k");
  if (params.noApply) args.push("--no-apply");
  if (params.config) args.push("--config");
  return args;
}

export function buildHostingClearArgs(params: { fullPath?: string }): string[] {
  const args: string[] = [];
  if (params.fullPath) args.push("-f", params.fullPath);
  return args;
}

export function buildHostingPruneArgs(params: { batch: number; dryRun?: boolean }): string[] {
  const args: string[] = [];
  args.push("--batch", String(params.batch));
  if (params.dryRun) args.push("--dry-run");
  return args;
}

export async function handleHostingDeploy(
  params: Record<string, unknown>,
  extra?: Record<string, unknown>
): Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }> {
  const flags: GlobalFlags = { mode: params.mode as string | undefined, profile: params.profile as string | undefined };
  const args = buildHostingDeployArgs(params as { batch: number; clear?: boolean; prune?: boolean; immediate?: boolean; keepStaged?: boolean; noApply?: boolean; config?: boolean; retry?: boolean; progress?: boolean });

  const onProgress = params.progress ? makeProgressCallback(extra) : undefined;
  let result: Awaited<ReturnType<typeof execCli>>;

  if (onProgress) {
    result = await execWithStreaming(
      "hosting",
      ["deploy", ...args],
      flags,
      NETWORK_TIMEOUT,
      onProgress
    );
  } else if (params.retry) {
    result = await execWithRetry("hosting", ["deploy", ...args], flags, NETWORK_TIMEOUT);
  } else {
    result = await execCli("hosting", ["deploy", ...args], flags, NETWORK_TIMEOUT);
  }

  const { text, isError } = formatResponse(result, "Hosting Deploy");
  return { content: [{ type: "text", text }], isError };
}

export async function handleHostingClear(
  params: Record<string, unknown>
): Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }> {
  const flags: GlobalFlags = { mode: params.mode as string | undefined, profile: params.profile as string | undefined };
  const args = buildHostingClearArgs(params as { fullPath?: string });
  const result = await execCli("hosting", ["clear", ...args], flags, NETWORK_TIMEOUT);
  const { text, isError } = formatResponse(result, "Hosting Clear");
  return { content: [{ type: "text", text }], isError };
}

export async function handleHostingPrune(
  params: Record<string, unknown>
): Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }> {
  const flags: GlobalFlags = { mode: params.mode as string | undefined, profile: params.profile as string | undefined };
  const args = buildHostingPruneArgs(params as { batch: number; dryRun?: boolean });
  const result = await execCli("hosting", ["prune", ...args], flags, NETWORK_TIMEOUT);
  const { text, isError } = formatResponse(result, "Hosting Prune");
  return { content: [{ type: "text", text }], isError };
}

export function registerHostingTools(server: McpServer): void {
  server.registerTool(
    "juno_hosting_deploy",
    {
      title: "Juno Hosting Deploy",
      description:
        "Deploy your app's frontend files to your satellite. Reads from the `source` directory defined in juno.config and uploads all assets. Supports batch parallelism, clearing before deploy, and pruning stale files after.",
      inputSchema: hostingDeploySchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params, extra) => handleHostingDeploy(params as Record<string, unknown>, extra)
  );

  server.registerTool(
    "juno_hosting_clear",
    {
      title: "Juno Hosting Clear",
      description:
        "Remove frontend files (JS, HTML, CSS, etc.) from your satellite. This does NOT remove user-uploaded files from custom collections — only the deployed app assets.",
      inputSchema: hostingClearSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params) => handleHostingClear(params as Record<string, unknown>)
  );

  server.registerTool(
    "juno_hosting_prune",
    {
      title: "Juno Hosting Prune",
      description:
        "Remove stale frontend files from your satellite that are no longer in your build output. Use --dry-run to preview which files would be deleted without actually deleting them.",
      inputSchema: hostingPruneSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params) => handleHostingPrune(params as Record<string, unknown>)
  );
}
