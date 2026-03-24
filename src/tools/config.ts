import { exec } from "node:child_process";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execCli, formatResponse } from "../cli.js";
import { configInitSchema, configApplySchema, createProjectSchema } from "../schemas/config.js";
import type { GlobalFlags } from "../types.js";

export function registerConfigTools(server: McpServer): void {
  server.registerTool(
    "juno_config_init",
    {
      title: "Juno Config Init",
      description: "Create a juno.config file (TypeScript, JavaScript, or JSON) at the project root. This file defines satellite IDs, source directory, and other project settings needed for deployment.",
      inputSchema: configInitSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params) => {
      const flags: GlobalFlags = { mode: params.mode, profile: params.profile };
      const args: string[] = [];
      if (params.minimal) args.push("--minimal");
      const result = await execCli("config", ["init", ...args], flags);
      return { content: [{ type: "text", text: formatResponse(result, "Config Init") }] };
    }
  );

  server.registerTool(
    "juno_config_apply",
    {
      title: "Juno Config Apply",
      description: "Apply the current juno.config file to your satellite. This is required after modifying settings like storage headers, datastore rules, authentication config, or collection definitions.",
      inputSchema: configApplySchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params) => {
      const flags: GlobalFlags = { mode: params.mode, profile: params.profile };
      const args: string[] = [];
      if (params.force) args.push("--force");
      const result = await execCli("config", ["apply", ...args], flags);
      return { content: [{ type: "text", text: formatResponse(result, "Config Apply") }] };
    }
  );

  server.registerTool(
    "juno_create_project",
    {
      title: "Juno Create Project",
      description: "Scaffold a new Juno project using `npm create juno@latest`. Creates a project directory with a chosen frontend framework template and Juno SDK pre-configured.",
      inputSchema: createProjectSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async (params) => {
      const pm = params.packageManager;
      const args = [params.directory];
      if (params.template) args.push("--template", params.template);

      const result = await new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve) => {
        const cmd = `${pm} create juno@latest ${args.join(" ")}`;
        exec(cmd, { timeout: 120_000 }, (error, stdout, stderr) => {
          resolve({
            stdout: stdout ?? "",
            stderr: stderr ?? "",
            exitCode: error ? 1 : 0
          });
        });
      });

      return { content: [{ type: "text", text: formatResponse(result, "Create Project") }] };
    }
  );
}
