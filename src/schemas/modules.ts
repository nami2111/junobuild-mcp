import { z } from "zod";
import { globalFlagsBase } from "./common.js";
import { ModuleTargetEnum } from "./enums.js";

const targetEnum = ModuleTargetEnum.describe("Module type");

export const moduleStartSchema = globalFlagsBase
  .extend({
    target: targetEnum
  })
  .strict();

export const moduleStopSchema = globalFlagsBase
  .extend({
    target: targetEnum
  })
  .strict();

export const moduleUpgradeSchema = globalFlagsBase
  .extend({
    target: targetEnum,
    src: z.string().optional().describe("Path to a specific local gzipped WASM file to publish"),
    clearChunks: z.boolean().default(false).describe("Clear previously uploaded WASM chunks"),
    noSnapshot: z.boolean().default(false).describe("Skip creating a snapshot before upgrading"),
    reset: z.boolean().default(false).describe("Reset to the initial state"),
    retry: z
      .boolean()
      .default(false)
      .describe(
        "Automatically retry on transient network failures (up to 3 attempts with exponential backoff)"
      ),
    progress: z
      .boolean()
      .default(false)
      .describe(
        "Stream progress updates during upgrade (shows build status and upload batch progress)"
      )
  })
  .strict();

export const moduleStatusSchema = globalFlagsBase.extend({}).strict();
