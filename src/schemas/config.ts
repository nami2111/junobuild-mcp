import { z } from "zod";
import { GlobalFlagsSchema } from "./common.js";

export const configInitSchema = z.object({
  minimal: z.boolean().default(false).describe("Skip prompts and generate a config file with a placeholder satellite ID"),
  ...GlobalFlagsSchema
}).strict();

export const configApplySchema = z.object({
  force: z.boolean().default(false).describe("Overwrite configuration without checks"),
  ...GlobalFlagsSchema
}).strict();

export const createProjectSchema = z.object({
  directory: z.string().describe("Directory name for the new project"),
  template: z.string().optional().describe("Template to use (e.g. react, svelte, vue, next)"),
  packageManager: z.enum(["npm", "yarn", "pnpm"]).default("npm").describe("Package manager to use")
}).strict();
