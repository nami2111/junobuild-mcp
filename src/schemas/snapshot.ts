import { z } from "zod";
import { GlobalFlagsSchema } from "./common.js";
import { ModuleTargetEnum } from "./enums.js";

const targetEnum = ModuleTargetEnum.describe("Module type to snapshot");

export const snapshotCreateSchema = z.object({
  target: targetEnum,
  ...GlobalFlagsSchema
}).strict();

export const snapshotDeleteSchema = z.object({
  target: targetEnum,
  ...GlobalFlagsSchema
}).strict();

export const snapshotListSchema = z.object({
  target: targetEnum,
  ...GlobalFlagsSchema
}).strict();

export const snapshotDownloadSchema = z.object({
  target: targetEnum,
  ...GlobalFlagsSchema
}).strict();

export const snapshotUploadSchema = z.object({
  dir: z.string().describe("Path to the snapshot directory containing metadata.json and chunks"),
  target: targetEnum,
  targetId: z.string().optional().describe("The module ID of a specific target to upload the snapshot to"),
  retry: z.boolean().default(false).describe("Automatically retry on transient network failures (up to 3 attempts with exponential backoff)"),
  ...GlobalFlagsSchema
}).strict();

export const snapshotRestoreSchema = z.object({
  target: targetEnum,
  ...GlobalFlagsSchema
}).strict();
