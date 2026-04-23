import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  execCli,
  execWithRetry,
  execWithStreaming,
  formatResponse,
  makeProgressCallback
} from "../cli.js";
import { hostingDeploySchema, hostingClearSchema, hostingPruneSchema } from "../schemas/hosting.js";
import { DEPLOY_TIMEOUT } from "../constants.js";
import type { GlobalFlags } from "../types.js";

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
    async (params, extra) => {
      const flags: GlobalFlags = { mode: params.mode, profile: params.profile };
      const args: string[] = [];
      args.push("--batch", String(params.batch));
      if (params.clear) args.push("--clear");
      if (params.prune) args.push("--prune");
      if (params.immediate) args.push("-i");
      if (params.keepStaged) args.push("-k");
      if (params.noApply) args.push("--no-apply");
      if (params.config) args.push("--config");

      let result: Awaited<ReturnType<typeof execCli>>;
      const onProgress = params.progress ? makeProgressCallback(extra) : undefined;

      if (onProgress) {
        result = await execWithStreaming(
          "hosting",
          ["deploy", ...args],
          flags,
          DEPLOY_TIMEOUT,
          onProgress
        );
      } else if (params.retry) {
        result = await execWithRetry("hosting", ["deploy", ...args], flags, DEPLOY_TIMEOUT);
      } else {
        result = await execCli("hosting", ["deploy", ...args], flags, DEPLOY_TIMEOUT);
      }

      const { text, isError } = formatResponse(result, "Hosting Deploy");
      return { content: [{ type: "text", text }], isError };
    }
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
    async (params) => {
      const flags: GlobalFlags = { mode: params.mode, profile: params.profile };
      const args: string[] = [];
      if (params.fullPath) args.push("-f", params.fullPath);
      const result = await execCli("hosting", ["clear", ...args], flags, DEPLOY_TIMEOUT);
      const { text, isError } = formatResponse(result, "Hosting Clear");
      return { content: [{ type: "text", text }], isError };
    }
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
    async (params) => {
      const flags: GlobalFlags = { mode: params.mode, profile: params.profile };
      const args: string[] = [];
      args.push("--batch", String(params.batch));
      if (params.dryRun) args.push("--dry-run");
      const result = await execCli("hosting", ["prune", ...args], flags, DEPLOY_TIMEOUT);
      const { text, isError } = formatResponse(result, "Hosting Prune");
      return { content: [{ type: "text", text }], isError };
    }
  );
}
