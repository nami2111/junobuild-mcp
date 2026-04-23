import { z } from "zod";
import { globalFlagsBase } from "./common.js";
import { ConfigFormatEnum, PackageManagerEnum } from "./enums.js";

export const configInitSchema = z
  .object({
    format: ConfigFormatEnum.default("typescript").describe("Config file format"),
    source: z.string().default("dist").describe("Build output directory (e.g. dist, build, out)"),
    satelliteId: z
      .string()
      .default("aaaaa-bbbbb-ccccc-ddddd-cai")
      .describe("Satellite ID for production environment. Use a real ID or leave the placeholder."),
    multiEnv: z
      .boolean()
      .default(false)
      .describe("Generate multi-environment config with staging and production satellite IDs"),
    stagingSatelliteId: z
      .string()
      .optional()
      .describe("Staging satellite ID (required if multiEnv is true)"),
    orbiterId: z.string().optional().describe("Optional Orbiter ID for analytics"),
    writeFile: z
      .boolean()
      .default(false)
      .describe("Write the config file directly to disk instead of returning content for preview"),
    path: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (val === undefined) return true;
          // Reject obvious traversal and absolute paths early at schema level
          return !val.includes("..") && !val.startsWith("/") && !val.startsWith("\\");
        },
        { message: "Path must be relative and not contain '..' traversal sequences" }
      )
      .describe(
        "Custom file path for the config (defaults to juno.config.ts/js/json in project root)"
      )
  })
  .strict();

export const configApplySchema = globalFlagsBase
  .extend({
    force: z.boolean().default(false).describe("Overwrite configuration without checks")
  })
  .strict();

export const createProjectSchema = z
  .object({
    directory: z.string().describe("Directory name for the new project"),
    template: z
      .string()
      .optional()
      .describe(
        "Template key to use (e.g. react-ts-starter, nextjs-starter, sveltekit-starter). Defaults to react-ts-starter."
      ),
    packageManager: PackageManagerEnum.default("npm")
      .optional()
      .describe("Package manager to use (npm, yarn, pnpm)")
  })
  .strict();
