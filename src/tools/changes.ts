import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  buildChangeApplyArgs as buildWorkflowChangeApplyArgs,
  buildChangeRejectArgs as buildWorkflowChangeRejectArgs
} from "../change-workflow.js";
import { registerJunoTools, type RegisteredJunoTool } from "../registered-tool.js";
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
  return buildWorkflowChangeApplyArgs(params);
}

export function buildChangesRejectArgs(params: {
  id: string;
  hash?: string;
  keepStaged?: boolean;
}): string[] {
  return buildWorkflowChangeRejectArgs(params);
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

export const changesTools: readonly RegisteredJunoTool[] = [
  {
    name: "juno_changes_list",
    title: "Juno Changes List",
    description:
      "List all submitted or applied changes to your module. By default shows only submitted (pending) changes. Use --all for full history and --every to include all statuses.",
    inputSchema: changesListSchema.shape,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    },
    handler: handleChangesList
  },
  {
    name: "juno_changes_apply",
    title: "Juno Changes Apply",
    description:
      "Apply a submitted change by its ID. Optionally create a snapshot before applying and verify the change hash for integrity.",
    inputSchema: changesApplySchema.shape,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true
    },
    handler: handleChangesApply
  },
  {
    name: "juno_changes_reject",
    title: "Juno Changes Reject",
    description:
      "Reject a submitted change by its ID. This prevents the change from being applied. Optionally verify the change hash for integrity.",
    inputSchema: changesRejectSchema.shape,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true
    },
    handler: handleChangesReject
  }
];

export function registerChangesTools(server: McpServer): void {
  registerJunoTools(server, changesTools);
}
