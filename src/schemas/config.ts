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
    .describe("Optional Orbiter ID for analytics")
}).strict();

export const configApplySchema = z.object({
  force: z.boolean().default(false).describe("Overwrite configuration without checks"),
  ...GlobalFlagsSchema
}).strict();

export const createProjectSchema = z.object({
  directory: z.string().describe("Directory name for the new project"),
  template: z.string().optional().describe("Template to use (e.g. react, svelte, vue, next)"),
  packageManager: PackageManagerEnum.default("npm").describe("Package manager to use")
}).strict();
