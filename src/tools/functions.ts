import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  execCli,
  execWithRetry,
  execWithStreaming,
  formatResponse,
  type ProgressCallback
} from "../cli.js";
import {
  functionsBuildSchema,
  functionsEjectSchema,
  functionsPublishSchema,
  functionsUpgradeSchema
} from "../schemas/functions.js";
import { DEPLOY_TIMEOUT } from "../constants.js";
import type { GlobalFlags } from "../types.js";

function makeProgressCallback(extra: unknown): ProgressCallback | undefined {
  const e = extra as {
    _meta?: Record<string, unknown>;
    sendNotification: (n: unknown) => Promise<void>;
  };
  const token = e._meta?.progressToken as string | number | undefined;
  if (!token) return undefined;

  return (progress: number, message: string) => {
    e.sendNotification({
      method: "notifications/progress",
      params: { progressToken: token, progress, total: 100, message }
    }).catch(() => {});
  };
}

export function registerFunctionsTools(server: McpServer): void {
  server.registerTool(
    "juno_functions_build",
    {
      title: "Juno Functions Build",
      description:
        "Build your serverless functions. Supports Rust, TypeScript, and JavaScript. The CLI auto-detects the language if not specified.",
      inputSchema: functionsBuildSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async (params) => {
      const args: string[] = [];
      if (params.lang) args.push("-l", params.lang);
      if (params.cargoPath) args.push("--cargo-path", params.cargoPath);
      if (params.sourcePath) args.push("--source-path", params.sourcePath);
      if (params.watch) args.push("--watch");
      const result = await execCli("functions", ["build", ...args], undefined, DEPLOY_TIMEOUT);
      const { text, isError } = formatResponse(result, "Functions Build");
      return { content: [{ type: "text", text }], isError };
    }
  );

  server.registerTool(
    "juno_functions_eject",
    {
      title: "Juno Functions Eject",
      description:
        "Generate the required files to begin developing serverless functions in your project. Scaffolds boilerplate for Rust, TypeScript, or JavaScript functions. Alias: `juno functions init`.",
      inputSchema: functionsEjectSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params) => {
      const args: string[] = [];
      if (params.lang) args.push("-l", params.lang);
      const result = await execCli("functions", ["eject", ...args]);
      const { text, isError } = formatResponse(result, "Functions Eject");
      return { content: [{ type: "text", text }], isError };
    }
  );

  server.registerTool(
    "juno_functions_publish",
    {
      title: "Juno Functions Publish",
      description:
        "Publish a new version of your serverless functions to the satellite. Optionally submit as a pending change without applying, or provide a custom WASM file path.",
      inputSchema: functionsPublishSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params, extra) => {
      const flags: GlobalFlags = { mode: params.mode, profile: params.profile };
      const args: string[] = [];
      if (params.src) args.push("-s", params.src);
      if (params.noApply) args.push("--no-apply");
      if (params.keepStaged) args.push("-k");

      let result: Awaited<ReturnType<typeof execCli>>;
      const onProgress = params.progress ? makeProgressCallback(extra) : undefined;

      if (onProgress) {
        result = await execWithStreaming(
          "functions",
          ["publish", ...args],
          flags,
          DEPLOY_TIMEOUT,
          onProgress
        );
      } else if (params.retry) {
        result = await execWithRetry("functions", ["publish", ...args], flags, DEPLOY_TIMEOUT);
      } else {
        result = await execCli("functions", ["publish", ...args], flags, DEPLOY_TIMEOUT);
      }

      const { text, isError } = formatResponse(result, "Functions Publish");
      return { content: [{ type: "text", text }], isError };
    }
  );

  server.registerTool(
    "juno_functions_upgrade",
    {
      title: "Juno Functions Upgrade",
      description:
        "Upgrade your satellite's serverless functions. Can use a local WASM file, select from CDN releases, or use the default local build output. Optionally create a snapshot before upgrading.",
      inputSchema: functionsUpgradeSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params, extra) => {
      const flags: GlobalFlags = { mode: params.mode, profile: params.profile };
      const args: string[] = [];
      if (params.src) args.push("-s", params.src);
      if (params.cdn) args.push("--cdn");
      if (params.cdnPath) args.push("--cdn-path", params.cdnPath);
      if (params.clearChunks) args.push("--clear-chunks");
      if (params.noSnapshot) args.push("--no-snapshot");
      if (params.reset) args.push("-r");

      let result: Awaited<ReturnType<typeof execCli>>;
      const onProgress = params.progress ? makeProgressCallback(extra) : undefined;

      if (onProgress) {
        result = await execWithStreaming(
          "functions",
          ["upgrade", ...args],
          flags,
          DEPLOY_TIMEOUT,
          onProgress
        );
      } else if (params.retry) {
        result = await execWithRetry("functions", ["upgrade", ...args], flags, DEPLOY_TIMEOUT);
      } else {
        result = await execCli("functions", ["upgrade", ...args], flags, DEPLOY_TIMEOUT);
      }

      const { text, isError } = formatResponse(result, "Functions Upgrade");
      return { content: [{ type: "text", text }], isError };
    }
  );
}
