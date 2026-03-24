import { z } from "zod";
import { GlobalFlagsSchema } from "./common.js";

const targetEnum = z.enum(["satellite", "s", "mission-control", "m", "orbiter", "o"]).describe("Module type");

export const moduleStartSchema = z.object({
  target: targetEnum,
  ...GlobalFlagsSchema
}).strict();

export const moduleStopSchema = z.object({
  target: targetEnum,
  ...GlobalFlagsSchema
}).strict();

export const moduleUpgradeSchema = z.object({
  target: targetEnum,
  src: z.string().optional().describe("Path to a specific local gzipped WASM file to publish"),
  clearChunks: z.boolean().default(false).describe("Clear previously uploaded WASM chunks"),
  noSnapshot: z.boolean().default(false).describe("Skip creating a snapshot before upgrading"),
  reset: z.boolean().default(false).describe("Reset to the initial state"),
  ...GlobalFlagsSchema
}).strict();

export const moduleStatusSchema = z.object({
  ...GlobalFlagsSchema
}).strict();
