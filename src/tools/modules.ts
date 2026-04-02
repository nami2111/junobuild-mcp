import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execCli, formatResponse } from "../cli.js";
import { moduleStartSchema, moduleStopSchema, moduleUpgradeSchema, moduleStatusSchema } from "../schemas/modules.js";
import { DEPLOY_TIMEOUT } from "../constants.js";
import type { GlobalFlags } from "../types.js";

export function registerModuleTools(server: McpServer): void {
  server.registerTool(
    "juno_module_start",
    {
      title: "Juno Module Start",
      description: "Start a stopped module. Target can be satellite (s), mission-control (m), or orbiter (o). Starting a module makes it available for requests.",
      inputSchema: moduleStartSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params) => {
      const flags: GlobalFlags = { mode: params.mode, profile: params.profile };
      const args = ["-t", params.target];
      const result = await execCli("start", args, flags);
      const { text, isError } = formatResponse(result, "Module Start");
      return { content: [{ type: "text", text }], isError };
    }
  );

  server.registerTool(
    "juno_module_stop",
    {
      title: "Juno Module Stop",
      description: "Stop a running module. Target can be satellite (s), mission-control (m), or orbiter (o). Stopping a module makes it unavailable for requests.",
      inputSchema: moduleStopSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params) => {
      const flags: GlobalFlags = { mode: params.mode, profile: params.profile };
      const args = ["-t", params.target];
      const result = await execCli("stop", args, flags);
      const { text, isError } = formatResponse(result, "Module Stop");
      return { content: [{ type: "text", text }], isError };
    }
  );

  server.registerTool(
    "juno_module_upgrade",
    {
      title: "Juno Module Upgrade",
      description: "Upgrade a module to a new version. Target can be satellite (s), mission-control (m), or orbiter (o). Optionally provide a custom WASM file. A snapshot is created before upgrading unless --no-snapshot is set.",
      inputSchema: moduleUpgradeSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params) => {
      const flags: GlobalFlags = { mode: params.mode, profile: params.profile };
      const args = ["-t", params.target];
      if (params.src) args.push("-s", params.src);
      if (params.clearChunks) args.push("--clear-chunks");
      if (params.noSnapshot) args.push("--no-snapshot");
      if (params.reset) args.push("-r");
      const result = await execCli("upgrade", args, flags, DEPLOY_TIMEOUT);
      const { text, isError } = formatResponse(result, "Module Upgrade");
      return { content: [{ type: "text", text }], isError };
    }
  );

  server.registerTool(
    "juno_module_status",
    {
      title: "Juno Module Status",
      description: "Check the status of all modules (satellites, mission control, orbiter). Shows running state, cycles balance, memory usage, and version info.",
      inputSchema: moduleStatusSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params) => {
      const flags: GlobalFlags = { mode: params.mode, profile: params.profile };
      const result = await execCli("status", [], flags);
      const { text, isError } = formatResponse(result, "Module Status");
      return { content: [{ type: "text", text }], isError };
    }
  );
}
