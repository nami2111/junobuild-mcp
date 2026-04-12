import { z } from "zod";
import { globalFlagsBase } from "./common.js";

export const hostingDeploySchema = globalFlagsBase
  .extend({
    batch: z
      .number()
      .int()
      .min(1)
      .max(200)
      .default(50)
      .describe("Number of files to upload in parallel per batch (1-200)"),
    clear: z.boolean().default(false).describe("Clear existing app files before deployment"),
    prune: z.boolean().default(false).describe("Prune stale app files after successful deployment"),
    immediate: z
      .boolean()
      .default(false)
      .describe("Deploy files instantly bypassing the change workflow"),
    keepStaged: z
      .boolean()
      .default(false)
      .describe("Keep proposed staged assets in memory after applying"),
    noApply: z
      .boolean()
      .default(false)
      .describe("Submit deployment as a change but do not apply it yet"),
    config: z.boolean().default(false).describe("Apply configuration after deployment succeeds"),
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
        "Stream progress updates during deployment (shows build status and upload batch progress)"
      )
  })
  .strict();

export const hostingClearSchema = globalFlagsBase
  .extend({
    fullPath: z.string().optional().describe("Clear a particular file by its path")
  })
  .strict();

export const hostingPruneSchema = globalFlagsBase
  .extend({
    batch: z
      .number()
      .int()
      .min(1)
      .max(200)
      .default(100)
      .describe("Number of files to prune in parallel per batch (1-200)"),
    dryRun: z.boolean().default(false).describe("List stale files without actually deleting them")
  })
  .strict();
