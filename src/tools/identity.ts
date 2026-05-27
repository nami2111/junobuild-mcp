import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeToolHandler } from "../tool-handler.js";
import { versionSchema, runScriptSchema, statusSchema } from "../schemas/identity.js";

export function buildRunScriptArgs(params: { src: string }): string[] {
  return ["-s", params.src];
}

export function buildStatusArgs(params: { containerUrl?: string; consoleUrl?: string }): string[] {
  const args: string[] = [];
  if (params.containerUrl) args.push("--container-url", params.containerUrl);
  if (params.consoleUrl) args.push("--console-url", params.consoleUrl);
  return args;
}

export const handleVersion = makeToolHandler({
  command: "version",
  subcommand: "",
  label: "Version",
  hasMode: false
});

export const handleRunScript = makeToolHandler({
  command: "run",
  subcommand: "",
  label: "Run Script",
  argsFromParams: (p) => buildRunScriptArgs(p as { src: string })
});

export const handleStatus = makeToolHandler({
  command: "status",
  subcommand: "",
  label: "Status",
  argsFromParams: (p) => buildStatusArgs(p as { containerUrl?: string; consoleUrl?: string })
});

export function registerIdentityTools(server: McpServer): void {
  server.registerTool(
    "juno_version",
    {
      title: "Juno Version",
      description:
        "Show the current versions of the Juno CLI and emulator (if running). Use --version flag.",
      inputSchema: versionSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    handleVersion
  );

  server.registerTool(
    "juno_run",
    {
      title: "Juno Run Script",
      description:
        "Run a custom JavaScript or TypeScript script in the CLI context. The script has access to the authenticated Juno environment.",
      inputSchema: runScriptSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    handleRunScript
  );

  server.registerTool(
    "juno_status",
    {
      title: "Juno Status",
      description:
        "Check the status of your modules (satellites, orbiters). Shows health, deployment status, and more.",
      inputSchema: statusSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    handleStatus
  );
}
