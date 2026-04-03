import { z } from "zod";
import { GlobalFlagsSchema } from "./common.js";
import { FunctionLanguageEnum } from "./enums.js";

export const functionsBuildSchema = z.object({
  lang: FunctionLanguageEnum.optional().describe("Language for building serverless functions"),
  cargoPath: z.string().optional().describe("Path to the Rust manifest (Cargo.toml)"),
  sourcePath: z.string().optional().describe("Path to the TypeScript or JavaScript entry file")
}).strict();

export const functionsEjectSchema = z.object({
  lang: FunctionLanguageEnum.optional().describe("Language for scaffolding serverless functions")
}).strict();

export const functionsPublishSchema = z.object({
  src: z.string().optional().describe("Path to a specific local gzipped WASM file to publish"),
  noApply: z.boolean().default(false).describe("Submit the release as a change but do not apply it yet"),
  keepStaged: z.boolean().default(false).describe("Keep proposed staged assets in memory after applying"),
  retry: z.boolean().default(false).describe("Automatically retry on transient network failures (up to 3 attempts with exponential backoff)"),
  progress: z.boolean().default(false).describe("Stream progress updates during publish (shows build status and upload batch progress)"),
  ...GlobalFlagsSchema
}).strict();

export const functionsUpgradeSchema = z.object({
  src: z.string().optional().describe("Path to a specific local gzipped WASM file"),
  cdnPath: z.string().optional().describe("Use a specific published WASM file from the CDN"),
  clearChunks: z.boolean().default(false).describe("Clear previously uploaded WASM chunks"),
  noSnapshot: z.boolean().default(false).describe("Skip creating a snapshot before upgrading"),
  reset: z.boolean().default(false).describe("Reset to the initial state"),
  retry: z.boolean().default(false).describe("Automatically retry on transient network failures (up to 3 attempts with exponential backoff)"),
  progress: z.boolean().default(false).describe("Stream progress updates during upgrade (shows build status and upload batch progress)"),
  ...GlobalFlagsSchema
}).strict();
