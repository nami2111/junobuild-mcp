import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeToolHandler } from "../tool-handler.js";
import { configInitSchema, configApplySchema } from "../schemas/config.js";

export interface ConfigInitParams {
  format: "typescript" | "javascript" | "json";
  source: string;
  satelliteId: string;
  multiEnv: boolean;
  stagingSatelliteId?: string;
  orbiterId?: string;
  writeFile: boolean;
  path?: string;
}

export function buildConfigOptionsSnippet(params: ConfigInitParams): string {
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

  return parts.join(",\n");
}

export function generateTypeScriptConfig(params: ConfigInitParams): string {
  return `import { defineConfig } from "@junobuild/config";

export default defineConfig({
${buildConfigOptionsSnippet(params)}
});`;
}

export function generateJavaScriptConfig(params: ConfigInitParams): string {
  return `const { defineConfig } = require("@junobuild/config");

module.exports = defineConfig({
${buildConfigOptionsSnippet(params)}
});`;
}

export function generateJsonConfig(params: ConfigInitParams): string {
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

function generateConfigContent(params: ConfigInitParams): {
  content: string;
  ext: string;
  lang: string;
} {
  switch (params.format) {
    case "typescript":
      return { content: generateTypeScriptConfig(params), ext: "ts", lang: "typescript" };
    case "javascript":
      return { content: generateJavaScriptConfig(params), ext: "js", lang: "javascript" };
    case "json":
      return { content: generateJsonConfig(params), ext: "json", lang: "json" };
  }
}

export function buildConfigApplyArgs(params: { force?: boolean }): string[] {
  const args: string[] = [];
  if (params.force) args.push("--force");
  return args;
}

export async function handleConfigInit(
  params: ConfigInitParams
): Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }> {
  const { content, ext } = generateConfigContent(params);
  const filename = params.path ?? `juno.config.${ext}`;

  if (params.writeFile) {
    const resolvedFile = resolve(filename);
    const cwd = resolve(process.cwd());
    if (!resolvedFile.startsWith(cwd + sep)) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Path traversal detected. The provided path must be within the project directory."
          }
        ],
        isError: true
      };
    }

    const dir = dirname(filename);
    if (dir && dir !== ".") {
      await mkdir(dir, { recursive: true });
    }
    await writeFile(filename, content, "utf-8");

    return {
      content: [
        {
          type: "text",
          text: `Config written to ${filename}\n\n## Next Steps\n\n1. Replace the placeholder satellite ID (\`aaaaa-bbbbb-ccccc-ddddd-cai\`) with your actual satellite ID from [Juno Console](https://console.juno.build)\n2. Run \`juno config apply\` to apply the configuration\n3. Run \`juno hosting deploy\` to deploy your static site\n\n**Note for authenticated deployments:** Set \`JUNO_TOKEN\` env var or use \`juno login\` in a browser first, then use the MCP tool with \`mode\` and \`profile\` parameters.`
        }
      ]
    };
  }

  const text = `## Juno Config (${ext.toUpperCase()})\n\nSave this as \`${filename}\` in your project root:\n\n\`\`\`${ext === "json" ? "json" : ext}\n${content}\n\`\`\`\n\n## Next Steps\n\n1. Replace the placeholder satellite ID with your actual satellite ID from [Juno Console](https://console.juno.build)\n2. Run \`juno config apply\` to apply the configuration\n3. Run \`juno hosting deploy\` to deploy\n\n**Authenticated deployments:** Set \`JUNO_TOKEN\` env var or use \`juno login\` in browser, then use MCP tool with \`mode\` and \`profile\` params.`;

  return { content: [{ type: "text", text }] };
}

export const handleConfigApply = makeToolHandler({
  command: "config",
  subcommand: "apply",
  label: "Config Apply",
  argsFromParams: (p) => buildConfigApplyArgs(p as { force?: boolean })
});

export function registerConfigTools(server: McpServer): void {
  server.registerTool(
    "juno_config_init",
    {
      title: "Juno Config Init",
      description:
        "Generate a juno.config file (TypeScript, JavaScript, or JSON). By default returns config content for preview. Set writeFile to true to write the file directly to disk. Then run juno_config_apply to push the config to your satellite.",
      inputSchema: configInitSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params) => handleConfigInit(params as ConfigInitParams)
  );

  server.registerTool(
    "juno_config_apply",
    {
      title: "Juno Config Apply",
      description:
        "Apply the current juno.config file to your satellite. This is required after modifying settings like storage headers, datastore rules, authentication config, or collection definitions.",
      inputSchema: configApplySchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    handleConfigApply
  );
}
