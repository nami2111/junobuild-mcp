import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeToolHandler } from "../tool-handler.js";
import { changesListSchema, changesApplySchema, changesRejectSchema } from "../schemas/changes.js";

export function buildChangesListArgs(params: { all?: boolean; every?: boolean }): string[] {
  const args: string[] = [];
  if (params.all) args.push("-a");
  if (params.every) args.push("-e");
  return args;
}

export function buildChangesApplyArgs(params: {
  id: string;
  snapshot?: boolean;
  hash?: string;
  keepStaged?: boolean;
}): string[] {
  const args = ["-i", params.id];
  if (params.snapshot) args.push("--snapshot");
  if (params.hash) args.push("--hash", params.hash);
  if (params.keepStaged) args.push("-k");
  return args;
}

export function buildChangesRejectArgs(params: {
  id: string;
  hash?: string;
  keepStaged?: boolean;
}): string[] {
  const args = ["-i", params.id];
  if (params.hash) args.push("--hash", params.hash);
  if (params.keepStaged) args.push("-k");
  return args;
}

export const handleChangesList = makeToolHandler({
  command: "changes",
  subcommand: "list",
  label: "Changes List",
  argsFromParams: (p) => buildChangesListArgs(p as { all?: boolean; every?: boolean })
});

export const handleChangesApply = makeToolHandler({
  command: "changes",
  subcommand: "apply",
  label: "Changes Apply",
  argsFromParams: (p) =>
    buildChangesApplyArgs(
      p as { id: string; snapshot?: boolean; hash?: string; keepStaged?: boolean }
    )
});

export const handleChangesReject = makeToolHandler({
  command: "changes",
  subcommand: "reject",
  label: "Changes Reject",
  argsFromParams: (p) =>
    buildChangesRejectArgs(p as { id: string; hash?: string; keepStaged?: boolean })
});

export function registerChangesTools(server: McpServer): void {
  server.registerTool(
    "juno_changes_list",
    {
      title: "Juno Changes List",
      description:
        "List all submitted or applied changes to your module. By default shows only submitted (pending) changes. Use --all for full history and --every to include all statuses.",
      inputSchema: changesListSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    handleChangesList
  );

  server.registerTool(
    "juno_changes_apply",
    {
      title: "Juno Changes Apply",
      description:
        "Apply a submitted change by its ID. Optionally create a snapshot before applying and verify the change hash for integrity.",
      inputSchema: changesApplySchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    handleChangesApply
  );

  server.registerTool(
    "juno_changes_reject",
    {
      title: "Juno Changes Reject",
      description:
        "Reject a submitted change by its ID. This prevents the change from being applied. Optionally verify the change hash for integrity.",
      inputSchema: changesRejectSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    handleChangesReject
  );
}
