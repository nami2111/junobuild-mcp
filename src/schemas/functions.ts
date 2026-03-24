import { z } from "zod";
import { GlobalFlagsSchema } from "./common.js";

export const functionsBuildSchema = z.object({
  lang: z.enum(["rust", "rs", "typescript", "ts", "javascript", "mjs"]).optional().describe("Language for building serverless functions"),
  cargoPath: z.string().optional().describe("Path to the Rust manifest (Cargo.toml)"),
  sourcePath: z.string().optional().describe("Path to the TypeScript or JavaScript entry file"),
  watch: z.boolean().default(false).describe("Rebuild functions automatically when source files change")
}).strict();

export const functionsEjectSchema = z.object({
  lang: z.enum(["rust", "rs", "typescript", "ts", "javascript", "mjs"]).optional().describe("Language for scaffolding serverless functions")
}).strict();

export const functionsPublishSchema = z.object({
  src: z.string().optional().describe("Path to a specific local gzipped WASM file to publish"),
  noApply: z.boolean().default(false).describe("Submit the release as a change but do not apply it yet"),
  keepStaged: z.boolean().default(false).describe("Keep proposed staged assets in memory after applying"),
  ...GlobalFlagsSchema
}).strict();

export const functionsUpgradeSchema = z.object({
  src: z.string().optional().describe("Path to a specific local gzipped WASM file"),
  cdn: z.boolean().default(false).describe("Select a previously published WASM from the CDN interactively"),
  cdnPath: z.string().optional().describe("Use a specific published WASM from the CDN"),
  clearChunks: z.boolean().default(false).describe("Clear previously uploaded WASM chunks"),
  noSnapshot: z.boolean().default(false).describe("Skip creating a snapshot before upgrading"),
  reset: z.boolean().default(false).describe("Reset to the initial state"),
  ...GlobalFlagsSchema
}).strict();
