import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execCli, formatResponse } from "../cli.js";
import { whoamiSchema, versionSchema, openSatelliteSchema, runScriptSchema } from "../schemas/identity.js";
import type { GlobalFlags } from "../types.js";

export function registerIdentityTools(server: McpServer): void {
  server.registerTool(
    "juno_whoami",
    {
      title: "Juno Who Am I",
      description: "Display your current profile, access key, and links to your satellite. Shows the authenticated identity and associated modules.",
      inputSchema: whoamiSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params) => {
      const flags: GlobalFlags = { mode: params.mode, profile: params.profile };
      const args: string[] = [];
      const result = await execCli("whoami", args, flags);
      return { content: [{ type: "text", text: formatResponse(result, "Who Am I") }] };
    }
  );

  server.registerTool(
    "juno_version",
    {
      title: "Juno Version",
      description: "Show the current versions of the Juno CLI and emulator (if running). Use --version flag.",
      inputSchema: versionSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async () => {
      const result = await execCli("--version", []);
      return { content: [{ type: "text", text: formatResponse(result, "Version") }] };
    }
  );

  server.registerTool(
    "juno_open",
    {
      title: "Juno Open Satellite",
      description: "Open your satellite in the browser or console. Useful for quickly viewing the deployed app or management console.",
      inputSchema: openSatelliteSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params) => {
      const flags: GlobalFlags = { mode: params.mode, profile: params.profile };
      const args: string[] = [];
      if (params.browser) args.push("-b", params.browser);
      if (params.console) args.push("-c");
      const result = await execCli("open", args, flags);
      return { content: [{ type: "text", text: formatResponse(result, "Open") }] };
    }
  );

  server.registerTool(
    "juno_run",
    {
      title: "Juno Run Script",
      description: "Run a custom JavaScript or TypeScript script in the CLI context. The script has access to the authenticated Juno environment.",
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
      const args = ["-s", params.src];
      const result = await execCli("run", args, flags);
      return { content: [{ type: "text", text: formatResponse(result, "Run Script") }] };
    }
  );
}
