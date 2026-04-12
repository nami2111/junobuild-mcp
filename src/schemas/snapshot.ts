import { z } from "zod";
import { globalFlagsBase } from "./common.js";
import { ModuleTargetEnum } from "./enums.js";

const targetEnum = ModuleTargetEnum.describe("Module type to snapshot");

export const snapshotCreateSchema = globalFlagsBase
  .extend({
    target: targetEnum
  })
  .strict();

export const snapshotDeleteSchema = globalFlagsBase
  .extend({
    target: targetEnum
  })
  .strict();

export const snapshotListSchema = globalFlagsBase
  .extend({
    target: targetEnum
  })
  .strict();

export const snapshotDownloadSchema = globalFlagsBase
  .extend({
    target: targetEnum
  })
  .strict();

export const snapshotUploadSchema = globalFlagsBase
  .extend({
    dir: z.string().describe("Path to the snapshot directory containing metadata.json and chunks"),
    target: targetEnum,
    targetId: z
      .string()
      .optional()
      .describe("The module ID of a specific target to upload the snapshot to"),
    retry: z
      .boolean()
      .default(false)
      .describe(
        "Automatically retry on transient network failures (up to 3 attempts with exponential backoff)"
      ),
    progress: z
      .boolean()
      .default(false)
      .describe("Stream progress updates during upload (shows upload batch progress)")
  })
  .strict();

export const snapshotRestoreSchema = globalFlagsBase
  .extend({
    target: targetEnum
  })
  .strict();
