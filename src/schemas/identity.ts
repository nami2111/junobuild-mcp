import { z } from "zod";
import { globalFlagsBase } from "./common.js";
import { BrowserEnum } from "./enums.js";

export const whoamiSchema = globalFlagsBase.extend({}).strict();

export const versionSchema = z.object({}).strict();

export const openSatelliteSchema = globalFlagsBase
  .extend({
    browser: BrowserEnum.optional().describe("Browser to open"),
    console: z.boolean().default(false).describe("Open satellite in the console")
  })
  .strict();

export const runScriptSchema = globalFlagsBase
  .extend({
    src: z.string().describe("Path to your JavaScript or TypeScript script")
  })
  .strict();
