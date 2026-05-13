import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execCli, formatResponse } from "../cli.js";
import { versionSchema, runScriptSchema, statusSchema } from "../schemas/identity.js";
import type { GlobalFlags } from "../types.js";

export function buildRunScriptArgs(params: { src: string }): string[] {
  return ["-s", params.src];
}

export function buildStatusArgs(params: {
  containerUrl?: string;
  consoleUrl?: string;
}): string[] {
  const args: string[] = [];
  if (params.containerUrl) args.push("--container-url", params.containerUrl);
  if (params.consoleUrl) args.push("--console-url", params.consoleUrl);
  return args;
}

export function registerIdentityTools(server: McpServer): void {
  server.registerTool(
    "juno_version",
    {
      title: "Juno Version",
      description:
        "Show the current versions of the Juno CLI and emulator (if running). Use --version flag.",
      inputSchema: versionSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async () => {
      const result = await execCli("version");
      const { text, isError } = formatResponse(result, "Version");
      return { content: [{ type: "text", text }], isError };
    }
  );

  server.registerTool(
    "juno_run",
    {
      title: "Juno Run Script",
      description:
        "Run a custom JavaScript or TypeScript script in the CLI context. The script has access to the authenticated Juno environment.",
      inputSchema: runScriptSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params) => {
      const flags: GlobalFlags = { mode: params.mode, profile: params.profile };
      const args = buildRunScriptArgs(params);
      const result = await execCli("run", args, flags);
      const { text, isError } = formatResponse(result, "Run Script");
      return { content: [{ type: "text", text }], isError };
    }
  );

  server.registerTool(
    "juno_status",
    {
      title: "Juno Status",
      description:
        "Check the status of your modules (satellites, orbiters). Shows health, deployment status, and more.",
      inputSchema: statusSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params) => {
      const flags: GlobalFlags = { mode: params.mode, profile: params.profile };
      const args = buildStatusArgs(params);
      const result = await execCli("status", args, flags);
      const { text, isError } = formatResponse(result, "Status");
      return { content: [{ type: "text", text }], isError };
    }
  );
}
