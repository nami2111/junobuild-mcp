import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execCli, execCommandNonInteractive, formatResponse } from "../cli.js";
import { configInitSchema, configApplySchema, createProjectSchema } from "../schemas/config.js";
import type { GlobalFlags } from "../types.js";

interface ConfigInitParams {
  format: "typescript" | "javascript" | "json";
  source: string;
  satelliteId: string;
  multiEnv: boolean;
  stagingSatelliteId?: string;
  orbiterId?: string;
  writeFile: boolean;
  path?: string;
}

function generateTypeScriptConfig(params: ConfigInitParams): string {
  const satelliteBlock = params.multiEnv
    ? `  satellite: {
    ids: {
      production: "${params.satelliteId}",
      staging: "${params.stagingSatelliteId ?? "bbbbb-ccccc-ddddd-eeeee-cai"}"
    },
    source: "${params.source}"
  }`
    : `  satellite: {
    id: "${params.satelliteId}",
    source: "${params.source}"
  }`;

  const orbiterBlock = params.orbiterId
    ? params.multiEnv
      ? `  orbiter: {
    ids: {
      production: "${params.orbiterId}"
    }
  }`
      : `  orbiter: {
    id: "${params.orbiterId}"
  }`
    : null;

  const parts = [satelliteBlock];
  if (orbiterBlock) parts.push(orbiterBlock);

  return `import { defineConfig } from "@junobuild/config";

export default defineConfig({
${parts.join(",\n")}
});`;
}

function generateJavaScriptConfig(params: ConfigInitParams): string {
  const satelliteBlock = params.multiEnv
    ? `  satellite: {
    ids: {
      production: "${params.satelliteId}",
      staging: "${params.stagingSatelliteId ?? "bbbbb-ccccc-ddddd-eeeee-cai"}"
    },
    source: "${params.source}"
  }`
    : `  satellite: {
    id: "${params.satelliteId}",
    source: "${params.source}"
  }`;

  const orbiterBlock = params.orbiterId
    ? params.multiEnv
      ? `  orbiter: {
    ids: {
      production: "${params.orbiterId}"
    }
  }`
      : `  orbiter: {
    id: "${params.orbiterId}"
  }`
    : null;

  const parts = [satelliteBlock];
  if (orbiterBlock) parts.push(orbiterBlock);

  return `const { defineConfig } = require("@junobuild/config");

module.exports = defineConfig({
${parts.join(",\n")}
});`;
}

function generateJsonConfig(params: ConfigInitParams): string {
  const config: Record<string, unknown> = {};

  if (params.multiEnv) {
    config.satellite = {
      ids: {
        production: params.satelliteId,
        staging: params.stagingSatelliteId ?? "bbbbb-ccccc-ddddd-eeeee-cai"
      },
      source: params.source
    };
  } else {
    config.satellite = {
      id: params.satelliteId,
      source: params.source
    };
  }

  if (params.orbiterId) {
    config.orbiter = params.multiEnv
      ? { ids: { production: params.orbiterId } }
      : { id: params.orbiterId };
  }

  return JSON.stringify(config, null, 2);
}

function generateConfigContent(params: ConfigInitParams): { content: string; ext: string; lang: string } {
  switch (params.format) {
    case "typescript":
      return { content: generateTypeScriptConfig(params), ext: "ts", lang: "typescript" };
    case "javascript":
      return { content: generateJavaScriptConfig(params), ext: "js", lang: "javascript" };
    case "json":
      return { content: generateJsonConfig(params), ext: "json", lang: "json" };
  }
}

export function registerConfigTools(server: McpServer): void {
  server.registerTool(
    "juno_config_init",
    {
      title: "Juno Config Init",
      description: "Generate a juno.config file (TypeScript, JavaScript, or JSON). By default returns config content for preview. Set writeFile to true to write the file directly to disk. Then run juno_config_apply to push the config to your satellite.",
      inputSchema: configInitSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params) => {
      const { content, ext } = generateConfigContent(params);
      const filename = params.path ?? `juno.config.${ext}`;

      if (params.writeFile) {
        const dir = dirname(filename);
        if (dir && dir !== ".") {
          await mkdir(dir, { recursive: true });
        }
        await writeFile(filename, content, "utf-8");

        return {
          content: [{
            type: "text",
            text: `Config written to ${filename}\n\nRun \`juno config apply\` to apply the configuration to your satellite.\n\n**Note:** Replace the placeholder satellite ID with your actual ID from the [Juno Console](https://console.juno.build).`
          }]
        };
      }

      const text = `## Juno Config (${ext.toUpperCase()})\n\nSave this as \`${filename}\` in your project root:\n\n\`\`\`${ext === "json" ? "json" : ext}\n${content}\n\`\`\`\n\nThen run \`juno config apply\` to apply the configuration to your satellite.\n\n**Note:** Replace the placeholder satellite ID with your actual ID from the [Juno Console](https://console.juno.build).`;

      return { content: [{ type: "text", text }] };
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
      const { text, isError } = formatResponse(result, "Config Apply");
      return { content: [{ type: "text", text }], isError };
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
      const args = [params.directory];
      if (params.template) args.push("--template", params.template);

      const cmd = `npx create-juno@latest ${args.join(" ")}`;

      const answers: string[] = [];
      answers.push("no");
      answers.push("no");

      if (params.template) {
        const serverlessLabels = { rust: "Rust", typescript: "TypeScript", none: "None" };
        answers.push(serverlessLabels[params.serverlessFunctions]);
        answers.push(params.githubAction ? "yes" : "no");
      }

      answers.push("no");

      const result = await execCommandNonInteractive(cmd, 300_000, undefined, answers);
      const { text, isError } = formatResponse(result, "Create Project");
      return { content: [{ type: "text", text }], isError };
    }
  );
}
