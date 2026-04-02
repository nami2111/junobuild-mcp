import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execCli, formatResponse } from "../cli.js";
import { changesListSchema, changesApplySchema, changesRejectSchema } from "../schemas/changes.js";

export function registerChangesTools(server: McpServer): void {
  server.registerTool(
    "juno_changes_list",
    {
      title: "Juno Changes List",
      description: "List all submitted or applied changes to your module. By default shows only submitted (pending) changes. Use --all for full history and --every to include all statuses.",
      inputSchema: changesListSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params) => {
      const args: string[] = [];
      if (params.all) args.push("-a");
      if (params.every) args.push("-e");
      const result = await execCli("changes", ["list", ...args]);
      const { text, isError } = formatResponse(result, "Changes List");
      return { content: [{ type: "text", text }], isError };
    }
  );

  server.registerTool(
    "juno_changes_apply",
    {
      title: "Juno Changes Apply",
      description: "Apply a submitted change by its ID. Optionally create a snapshot before applying and verify the change hash for integrity.",
      inputSchema: changesApplySchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params) => {
      const args = ["-i", params.id];
      if (params.snapshot) args.push("--snapshot");
      if (params.hash) args.push("--hash", params.hash);
      if (params.keepStaged) args.push("-k");
      const result = await execCli("changes", ["apply", ...args]);
      const { text, isError } = formatResponse(result, "Changes Apply");
      return { content: [{ type: "text", text }], isError };
    }
  );

  server.registerTool(
    "juno_changes_reject",
    {
      title: "Juno Changes Reject",
      description: "Reject a submitted change by its ID. This prevents the change from being applied. Optionally verify the change hash for integrity.",
      inputSchema: changesRejectSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params) => {
      const args = ["-i", params.id];
      if (params.hash) args.push("--hash", params.hash);
      if (params.keepStaged) args.push("-k");
      const result = await execCli("changes", ["reject", ...args]);
      const { text, isError } = formatResponse(result, "Changes Reject");
      return { content: [{ type: "text", text }], isError };
    }
  );
}
