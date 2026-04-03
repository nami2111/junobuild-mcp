import { z } from "zod";
import { GlobalFlagsSchema } from "./common.js";

export const hostingDeploySchema = z.object({
  batch: z.number().int().min(1).max(200).default(50).describe("Number of files to upload in parallel per batch (1-200)"),
  clear: z.boolean().default(false).describe("Clear existing app files before deployment"),
  prune: z.boolean().default(false).describe("Prune stale app files after successful deployment"),
  immediate: z.boolean().default(false).describe("Deploy files instantly bypassing the change workflow"),
  keepStaged: z.boolean().default(false).describe("Keep proposed staged assets in memory after applying"),
  noApply: z.boolean().default(false).describe("Submit deployment as a change but do not apply it yet"),
  config: z.boolean().default(false).describe("Apply configuration after deployment succeeds"),
  ...GlobalFlagsSchema
}).strict();

export const hostingClearSchema = z.object({
  fullPath: z.string().optional().describe("Clear a particular file by its path"),
  ...GlobalFlagsSchema
}).strict();

export const hostingPruneSchema = z.object({
  batch: z.number().int().min(1).max(200).default(100).describe("Number of files to prune in parallel per batch (1-200)"),
  dryRun: z.boolean().default(false).describe("List stale files without actually deleting them"),
  ...GlobalFlagsSchema
}).strict();
