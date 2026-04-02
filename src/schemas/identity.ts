import { z } from "zod";
import { GlobalFlagsSchema } from "./common.js";
import { BrowserEnum } from "./enums.js";

export const whoamiSchema = z.object({
  ...GlobalFlagsSchema
}).strict();

export const versionSchema = z.object({}).strict();

export const openSatelliteSchema = z.object({
  browser: BrowserEnum.optional().describe("Browser to open"),
  console: z.boolean().default(false).describe("Open satellite in the console"),
  ...GlobalFlagsSchema
}).strict();

export const runScriptSchema = z.object({
  src: z.string().describe("Path to your JavaScript or TypeScript script"),
  ...GlobalFlagsSchema
}).strict();
