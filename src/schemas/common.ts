import { z } from "zod";

const junoModeField = z
  .enum(["production", "staging", "development"])
  .optional()
  .describe("Environment mode: production, staging, or development");

const junoProfileField = z
  .string()
  .optional()
  .describe("Profile name for multi-identity management");

const junoContainerUrlField = z
  .string()
  .optional()
  .describe(
    "Override a custom container URL. If omitted, the Juno CLI uses production or the local container in development mode"
  );

const junoConsoleUrlField = z
  .string()
  .optional()
  .describe("Specify a custom URL to access the developer Console");

export const globalFlagsBase = z
  .object({
    mode: junoModeField,
    profile: junoProfileField
  })
  .strict();

export const containerFlagsBase = z
  .object({
    mode: junoModeField,
    profile: junoProfileField,
    containerUrl: junoContainerUrlField
  })
  .strict();

export const environmentFlagsBase = z
  .object({
    mode: junoModeField,
    profile: junoProfileField,
    containerUrl: junoContainerUrlField,
    consoleUrl: junoConsoleUrlField
  })
  .strict();
