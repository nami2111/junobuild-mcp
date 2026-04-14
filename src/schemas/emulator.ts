import { z } from "zod";
import { FunctionLanguageEnum } from "./enums.js";

export const emulatorStartSchema = z
  .object({
    lang: FunctionLanguageEnum.optional().describe("Language for building serverless functions"),
    cargoPath: z.string().optional().describe("Path to the Rust manifest (Cargo.toml)"),
    sourcePath: z.string().optional().describe("Path to the TypeScript or JavaScript entry file"),
    watch: z
      .boolean()
      .default(false)
      .describe("Rebuild your functions automatically when source files change"),
    wait: z.boolean().default(false).describe("Wait until the emulator is ready before returning"),
    timeout: z
      .number()
      .int()
      .min(1000)
      .max(600_000)
      .default(120_000)
      .describe("Timeout in ms for the emulator to be ready when wait is true (1000-600000)")
  })
  .strict();

export const emulatorStopSchema = z.object({}).strict();

export const emulatorClearSchema = z.object({}).strict();

export const emulatorWaitSchema = z
  .object({
    timeout: z
      .number()
      .int()
      .min(1000)
      .max(600_000)
      .default(120_000)
      .describe("Timeout in ms for the emulator to be ready (1000-600000)")
  })
  .strict();
