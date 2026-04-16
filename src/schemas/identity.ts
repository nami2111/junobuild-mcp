import { z } from "zod";
import { globalFlagsBase } from "./common.js";

export const versionSchema = z.object({}).strict();

export const runScriptSchema = globalFlagsBase
  .extend({
    src: z.string().describe("Path to your JavaScript or TypeScript script")
  })
  .strict();
