import { z } from "zod";
import { GlobalFlagsSchema } from "./common.js";

const targetEnum = z.enum(["satellite", "s", "mission-control", "m", "orbiter", "o"]).describe("Module type to snapshot");

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
  ...GlobalFlagsSchema
}).strict();

export const snapshotRestoreSchema = z.object({
  target: targetEnum,
  ...GlobalFlagsSchema
}).strict();
