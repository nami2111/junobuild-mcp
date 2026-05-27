import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { containerContext, environmentContext } from "../juno-context.js";
import {
  type RegisteredJunoTool,
  registerJunoTools,
} from "../registered-tool.js";
import {
  runScriptSchema,
  statusSchema,
  versionSchema,
} from "../schemas/identity.js";
import { makeToolHandler } from "../tool-handler.js";

export function buildRunScriptArgs(params: { src: string }): string[] {
  return ["-s", params.src];
}

export const handleVersion = makeToolHandler({
  command: "version",
  subcommand: "",
  label: "Version",
  hasMode: false,
});

export const handleRunScript = makeToolHandler({
  command: "run",
  subcommand: "",
  label: "Run Script",
  context: containerContext,
  argsFromParams: (p) => buildRunScriptArgs(p as { src: string }),
});

export const handleStatus = makeToolHandler({
  command: "status",
  subcommand: "",
  label: "Status",
  context: environmentContext,
});

export const identityTools: readonly RegisteredJunoTool[] = [
  {
    name: "juno_version",
    title: "Juno Version",
    description:
      "Show the current versions of the Juno CLI and emulator (if running). Use --version flag.",
    inputSchema: versionSchema.shape,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    handler: handleVersion,
  },
  {
    name: "juno_run",
    title: "Juno Run Script",
    description:
      "Run a custom JavaScript or TypeScript script in the CLI context. The script has access to the authenticated Juno environment.",
    inputSchema: runScriptSchema.shape,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    handler: handleRunScript,
  },
  {
    name: "juno_status",
    title: "Juno Status",
    description:
      "Check the status of your modules (satellites, orbiters). Shows health, deployment status, and more.",
    inputSchema: statusSchema.shape,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: handleStatus,
  },
];

export function registerIdentityTools(server: McpServer): void {
  registerJunoTools(server, identityTools);
}
