import { z } from "zod";
import { GlobalFlagsSchema } from "./common.js";
import { ConfigFormatEnum, PackageManagerEnum } from "./enums.js";

export const configInitSchema = z.object({
  format: ConfigFormatEnum.default("typescript")
    .describe("Config file format"),
  source: z.string().default("dist")
    .describe("Build output directory (e.g. dist, build, out)"),
  satelliteId: z.string().default("aaaaa-bbbbb-ccccc-ddddd-cai")
    .describe("Satellite ID for production environment. Use a real ID or leave the placeholder."),
  multiEnv: z.boolean().default(false)
    .describe("Generate multi-environment config with staging and production satellite IDs"),
  stagingSatelliteId: z.string().optional()
    .describe("Staging satellite ID (required if multiEnv is true)"),
  orbiterId: z.string().optional()
    .describe("Optional Orbiter ID for analytics"),
  writeFile: z.boolean().default(false)
    .describe("Write the config file directly to disk instead of returning content for preview"),
  path: z.string().optional()
    .describe("Custom file path for the config (defaults to juno.config.ts/js/json in project root)")
}).strict();

export const configApplySchema = z.object({
  force: z.boolean().default(false).describe("Overwrite configuration without checks"),
  ...GlobalFlagsSchema
}).strict();

export const createProjectSchema = z.object({
  directory: z.string().describe("Directory name for the new project"),
  template: z.string().optional().describe("Template key to use (e.g. react-ts-starter, nextjs-starter, sveltekit-starter). See https://github.com/junobuild/create-juno for available templates."),
  packageManager: PackageManagerEnum.default("npm").describe("Package manager to use"),
  serverlessFunctions: z.enum(["rust", "typescript", "none"]).default("none").describe("Include serverless functions: 'rust', 'typescript', or 'none'"),
  githubAction: z.boolean().default(false).describe("Set up a GitHub Action for deployment")
}).strict();
