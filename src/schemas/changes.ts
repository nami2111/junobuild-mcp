import { z } from "zod";

export const changesListSchema = z
  .object({
    all: z
      .boolean()
      .default(false)
      .describe("Search through all changes, not just the 100 most recent"),
    every: z
      .boolean()
      .default(false)
      .describe("Include changes of any status (default is only submitted ones)")
  })
  .strict();

export const changesApplySchema = z
  .object({
    id: z.string().describe("The ID of the change to apply"),
    snapshot: z.boolean().default(false).describe("Create a snapshot before applying"),
    hash: z.string().optional().describe("Expected hash of all included changes for verification"),
    keepStaged: z
      .boolean()
      .default(false)
      .describe("Keep proposed staged assets in memory after applying")
  })
  .strict();

export const changesRejectSchema = z
  .object({
    id: z.string().describe("The ID of the change to reject"),
    hash: z.string().optional().describe("Expected hash of all included changes for verification"),
    keepStaged: z
      .boolean()
      .default(false)
      .describe("Keep proposed staged assets in memory after rejecting")
  })
  .strict();
