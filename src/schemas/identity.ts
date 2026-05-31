import { z } from "zod";
import { containerFlagsBase, environmentFlagsBase } from "./common.js";

export const versionSchema = z.object({}).strict();

export const runScriptSchema = containerFlagsBase
  .extend({
    src: z.string().describe("Path to your JavaScript or TypeScript script"),
  })
  .strict();

export const statusSchema = environmentFlagsBase;

export const authStatusSchema = environmentFlagsBase;
