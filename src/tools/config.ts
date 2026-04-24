import { mkdir, writeFile, rename } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execCli, formatResponse } from "../cli.js";
import { configInitSchema, configApplySchema, createProjectSchema } from "../schemas/config.js";
import { DEPLOY_TIMEOUT } from "../constants.js";
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

function buildConfigOptionsSnippet(params: ConfigInitParams): string {
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

function generateTypeScriptConfig(params: ConfigInitParams): string {
  return `import { defineConfig } from "@junobuild/config";

export default defineConfig({
${buildConfigOptionsSnippet(params)}
});`;
}

function generateJavaScriptConfig(params: ConfigInitParams): string {
  return `const { defineConfig } = require("@junobuild/config");

module.exports = defineConfig({
${buildConfigOptionsSnippet(params)}
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
    async (params) => {
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
    async (params) => {
      const flags: GlobalFlags = { mode: params.mode, profile: params.profile };
      const args: string[] = [];
      if (params.force) args.push("--force");
      const result = await execCli("config", ["apply", ...args], flags, DEPLOY_TIMEOUT);
      const { text, isError } = formatResponse(result, "Config Apply");
      return { content: [{ type: "text", text }], isError };
    }
  );

  server.registerTool(
    "juno_create_project",
    {
      title: "Juno Create Project",
      description:
        "Scaffold a new Juno project. Uses Vite to create the frontend, then adds Juno SDK and config. Does NOT use the interactive create-juno CLI.",
      inputSchema: createProjectSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async (params) => {
      try {
        const { execCommandNonInteractive } = await import("../cli.js");
        const dir = params.directory;
        const template = params.template || "react-ts-starter";
        const pm = params.packageManager;

        const TEMPLATE_MAP: Record<string, string> = {
          "react-ts-starter": "react --template-ts",
          "react-javascript": "react",
          "nextjs-starter": "next",
          "sveltekit-starter": "svelte",
          "angular-starter": "angular",
          "vue-starter": "vue"
        };

        const viteTemplate = TEMPLATE_MAP[template] || "react --template-ts";
        const sourceDir = `src-${Date.now()}`;

        const result = await execCommandNonInteractive(
          `npm create vite@latest ${sourceDir} -- --template ${viteTemplate}`,
          120_000
        );

        if (result.exitCode !== 0) {
          return {
            content: [{ type: "text", text: result.stderr || result.stdout }],
            isError: true
          };
        }

        await rename(sourceDir, dir);

        const packageJsonPath = `${dir}/package.json`;
        const { readFile, writeFile } = await import("node:fs/promises");

        const pkg = JSON.parse(await readFile(packageJsonPath, "utf-8"));
        pkg.name = dir;
        await writeFile(packageJsonPath, JSON.stringify(pkg, null, 2));

        const deps = ["@junobuild/core"];
        for (const dep of deps) {
          const addResult = await execCommandNonInteractive(`${pm} add ${dep}`, 120_000, dir);
          if (addResult.exitCode !== 0) {
            // Skip if package not found - static sites don't need SDK
          }
        }

        const configContent = `import type { SatelliteConfig } from "@junobuild/config";

export default {
  satellite: {
    source: "dist"
  }
} satisfies SatelliteConfig;
`;
        const configDir = `${dir}`;
        await writeFile(`${configDir}/juno.config.ts`, configContent);

        let output = `Project "${dir}" created with ${template} template.\n`;
        output += `\n## Next Steps\n`;
        output += `1. cd ${dir} && ${pm} install\n`;
        output += `2. Replace placeholder satellite ID in juno.config.ts with your real ID\n`;
        output += `3. ${pm} run dev\n`;
        output += `4. juno emulator start  # in another terminal\n`;
        output += `5. juno hosting deploy --mode development\n`;
        output += `\nFor production: ${pm} run build && juno hosting deploy\n`;

        return {
          content: [{ type: "text", text: output }]
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Failed to create project: ${message}` }],
          isError: true
        };
      }
    }
  );
}
