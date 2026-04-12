import { z } from "zod";

export const globalFlagsBase = z.object({
  mode: z
    .enum(["production", "staging", "development"])
    .optional()
    .describe("Environment mode: production, staging, or development"),
  profile: z.string().optional().describe("Profile name for multi-identity management")
});
