import { z } from "zod";
import { PackageManagerEnum } from "./enums.js";

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
      .describe("Package manager to use (npm, yarn, pnpm)"),
  })
  .strict();
