import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildChangeSubmissionArgs } from "../change-workflow.js";
import { environmentContext } from "../juno-context.js";
import {
  type RegisteredJunoTool,
  registerJunoTools,
} from "../registered-tool.js";
import {
  functionsBuildSchema,
  functionsEjectSchema,
  functionsPublishSchema,
  functionsUpgradeSchema,
} from "../schemas/functions.js";
import { makeToolHandler } from "../tool-handler.js";

export function buildFunctionsBuildArgs(params: {
  lang?: string;
  cargoPath?: string;
  sourcePath?: string;
  watch?: boolean;
}): string[] {
  const args: string[] = [];
  if (params.lang) {
    args.push("-l", params.lang);
  }
  if (params.cargoPath) {
    args.push("--cargo-path", params.cargoPath);
  }
  if (params.sourcePath) {
    args.push("--source-path", params.sourcePath);
  }
  if (params.watch) {
    args.push("--watch");
  }
  return args;
}

export function buildFunctionsEjectArgs(params: { lang?: string }): string[] {
  const args: string[] = [];
  if (params.lang) {
    args.push("-l", params.lang);
  }
  return args;
}

export function buildFunctionsPublishArgs(params: {
  src?: string;
  noApply?: boolean;
  keepStaged?: boolean;
  retry?: boolean;
  progress?: boolean;
}): string[] {
  const args: string[] = [];
  if (params.src) {
    args.push("-s", params.src);
  }
  args.push(...buildChangeSubmissionArgs(params));
  return args;
}

export function buildFunctionsUpgradeArgs(params: {
  src?: string;
  cdn?: boolean;
  cdnPath?: string;
  clearChunks?: boolean;
  noSnapshot?: boolean;
  reset?: boolean;
  retry?: boolean;
  progress?: boolean;
}): string[] {
  const args: string[] = [];
  if (params.src) {
    args.push("-s", params.src);
  }
  if (params.cdn) {
    args.push("--cdn");
  }
  if (params.cdnPath) {
    args.push("--cdn-path", params.cdnPath);
  }
  if (params.clearChunks) {
    args.push("--clear-chunks");
  }
  if (params.noSnapshot) {
    args.push("--no-snapshot");
  }
  if (params.reset) {
    args.push("-r");
  }
  return args;
}

export const handleFunctionsBuild = makeToolHandler({
  command: "functions",
  subcommand: "build",
  label: "Functions Build",
  hasMode: false,
  argsFromParams: (p) =>
    buildFunctionsBuildArgs(
      p as {
        lang?: string;
        cargoPath?: string;
        sourcePath?: string;
        watch?: boolean;
      }
    ),
});

export const handleFunctionsEject = makeToolHandler({
  command: "functions",
  subcommand: "eject",
  label: "Functions Eject",
  hasMode: false,
  argsFromParams: (p) => buildFunctionsEjectArgs(p as { lang?: string }),
});

export const handleFunctionsPublish = makeToolHandler({
  command: "functions",
  subcommand: "publish",
  label: "Functions Publish",
  context: environmentContext,
  argsFromParams: (p) =>
    buildFunctionsPublishArgs(
      p as {
        src?: string;
        noApply?: boolean;
        keepStaged?: boolean;
        retry?: boolean;
        progress?: boolean;
      }
    ),
  getStrategy: (p) => {
    if (p.progress || p.streamLogs) {
      return "streaming";
    }
    if (p.retry) {
      return "retry";
    }
    return "simple";
  },
});

export const handleFunctionsUpgrade = makeToolHandler({
  command: "functions",
  subcommand: "upgrade",
  label: "Functions Upgrade",
  context: environmentContext,
  argsFromParams: (p) =>
    buildFunctionsUpgradeArgs(
      p as {
        src?: string;
        cdn?: boolean;
        cdnPath?: string;
        clearChunks?: boolean;
        noSnapshot?: boolean;
        reset?: boolean;
        retry?: boolean;
        progress?: boolean;
      }
    ),
  getStrategy: (p) => {
    if (p.progress || p.streamLogs) {
      return "streaming";
    }
    if (p.retry) {
      return "retry";
    }
    return "simple";
  },
});

export const functionsTools: readonly RegisteredJunoTool[] = [
  {
    name: "juno_functions_build",
    title: "Juno Functions Build",
    description:
      "Build your serverless functions. Supports Rust, TypeScript, and JavaScript. The CLI auto-detects the language if not specified.",
    inputSchema: functionsBuildSchema.shape,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    handler: handleFunctionsBuild,
  },
  {
    name: "juno_functions_eject",
    title: "Juno Functions Eject",
    description:
      "Generate the required files to begin developing serverless functions in your project. Scaffolds boilerplate for Rust, TypeScript, or JavaScript functions. Alias: `juno functions init`.",
    inputSchema: functionsEjectSchema.shape,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    handler: handleFunctionsEject,
  },
  {
    name: "juno_functions_publish",
    title: "Juno Functions Publish",
    description:
      "Publish a new version of your serverless functions to the satellite. Optionally submit as a pending change without applying, or provide a custom WASM file path.",
    inputSchema: functionsPublishSchema.shape,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    handler: handleFunctionsPublish,
  },
  {
    name: "juno_functions_upgrade",
    title: "Juno Functions Upgrade",
    description:
      "Upgrade your satellite's serverless functions. Can use a local WASM file, select from CDN releases, or use the default local build output. Optionally create a snapshot before upgrading.",
    inputSchema: functionsUpgradeSchema.shape,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    handler: handleFunctionsUpgrade,
  },
];

export function registerFunctionsTools(server: McpServer): void {
  registerJunoTools(server, functionsTools);
}
