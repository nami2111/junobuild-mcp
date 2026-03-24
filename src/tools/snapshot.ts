import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execCli, formatResponse } from "../cli.js";
import {
  snapshotCreateSchema,
  snapshotDeleteSchema,
  snapshotListSchema,
  snapshotDownloadSchema,
  snapshotUploadSchema,
  snapshotRestoreSchema
} from "../schemas/snapshot.js";
import { DEPLOY_TIMEOUT } from "../constants.js";
import type { GlobalFlags } from "../types.js";

export function registerSnapshotTools(server: McpServer): void {
  server.registerTool(
    "juno_snapshot_create",
    {
      title: "Juno Snapshot Create",
      description: "Create a snapshot of your module's current state. Snapshots capture the full state and can be used for backup or migration. Target can be satellite (s), mission-control (m), or orbiter (o).",
      inputSchema: snapshotCreateSchema.shape,
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
      const result = await execCli("snapshot", ["create", ...args], flags, DEPLOY_TIMEOUT);
      return { content: [{ type: "text", text: formatResponse(result, "Snapshot Create") }] };
    }
  );

  server.registerTool(
    "juno_snapshot_delete",
    {
      title: "Juno Snapshot Delete",
      description: "Delete an existing snapshot. This permanently removes the snapshot and cannot be undone.",
      inputSchema: snapshotDeleteSchema.shape,
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
      const result = await execCli("snapshot", ["delete", ...args], flags);
      return { content: [{ type: "text", text: formatResponse(result, "Snapshot Delete") }] };
    }
  );

  server.registerTool(
    "juno_snapshot_list",
    {
      title: "Juno Snapshot List",
      description: "List all existing snapshots for a module type. Shows snapshot IDs, creation dates, and sizes. Target can be satellite (s), mission-control (m), or orbiter (o).",
      inputSchema: snapshotListSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params) => {
      const flags: GlobalFlags = { mode: params.mode, profile: params.profile };
      const args = ["-t", params.target];
      const result = await execCli("snapshot", ["list", ...args], flags);
      return { content: [{ type: "text", text: formatResponse(result, "Snapshot List") }] };
    }
  );

  server.registerTool(
    "juno_snapshot_download",
    {
      title: "Juno Snapshot Download",
      description: "Download a snapshot to offline files on your local machine. Useful for backup or transferring state between environments.",
      inputSchema: snapshotDownloadSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params) => {
      const flags: GlobalFlags = { mode: params.mode, profile: params.profile };
      const args = ["-t", params.target];
      const result = await execCli("snapshot", ["download", ...args], flags, DEPLOY_TIMEOUT);
      return { content: [{ type: "text", text: formatResponse(result, "Snapshot Download") }] };
    }
  );

  server.registerTool(
    "juno_snapshot_upload",
    {
      title: "Juno Snapshot Upload",
      description: "Upload a snapshot from offline files. Provide the directory path containing metadata.json and chunks, and the target module type.",
      inputSchema: snapshotUploadSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params) => {
      const flags: GlobalFlags = { mode: params.mode, profile: params.profile };
      const args = ["--dir", params.dir, "-t", params.target];
      if (params.targetId) args.push("--target-id", params.targetId);
      const result = await execCli("snapshot", ["upload", ...args], flags, DEPLOY_TIMEOUT);
      return { content: [{ type: "text", text: formatResponse(result, "Snapshot Upload") }] };
    }
  );

  server.registerTool(
    "juno_snapshot_restore",
    {
      title: "Juno Snapshot Restore",
      description: "Restore a module to a previously created snapshot state. This will overwrite the current state with the snapshot data.",
      inputSchema: snapshotRestoreSchema.shape,
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
      const result = await execCli("snapshot", ["restore", ...args], flags, DEPLOY_TIMEOUT);
      return { content: [{ type: "text", text: formatResponse(result, "Snapshot Restore") }] };
    }
  );
}
