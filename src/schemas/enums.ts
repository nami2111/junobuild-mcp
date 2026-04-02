import { z } from "zod";

export const FunctionLanguageEnum = z.enum(["rust", "rs", "typescript", "ts", "javascript", "mjs"]);

export const ModuleTargetEnum = z.enum(["satellite", "s", "mission-control", "m", "orbiter", "o"]);

export const PackageManagerEnum = z.enum(["npm", "yarn", "pnpm"]);

export const ConfigFormatEnum = z.enum(["typescript", "javascript", "json"]);

export const BrowserEnum = z.enum(["chrome", "firefox", "edge"]);
