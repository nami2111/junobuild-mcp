import { z } from "zod";

export const FunctionLanguageEnum = z.enum(["rust", "rs", "typescript", "ts", "javascript", "mjs"]);

export const PackageManagerEnum = z.enum(["npm", "yarn", "pnpm"]);

export const ConfigFormatEnum = z.enum(["typescript", "javascript", "json"]);
