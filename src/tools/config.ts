import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execCli, execCommand, formatResponse } from "../cli.js";
import { configInitSchema, configApplySchema, createProjectSchema } from "../schemas/config.js";
import type { GlobalFlags } from "../types.js";

interface ConfigInitParams {
  format: "typescript" | "javascript" | "json";
  source: string;
  satelliteId: string;
  multiEnv: boolean;
  stagingSatelliteId?: string;
  orbiterId?: string;
}

function generateTypeScriptConfig(params: ConfigInitParams): string {
  const lines: string[] = [];
  lines.push('import { defineConfig } from "@junobuild/config";');
  lines.push("");
  lines.push("export default defineConfig({");

  if (params.multiEnv) {
    const stagingId = params.stagingSatelliteId ?? "bbbbb-ccccc-ddddd-eeeee-cai";
    lines.push("  satellite: {");
    lines.push("    ids: {");
    lines.push(`      production: "${params.satelliteId}",`);
    lines.push(`      staging: "${stagingId}"`);
    lines.push("    },");
    lines.push(`    source: "${params.source}"`);
    if (params.orbiterId) {
      lines.push("  },");
    } else {
      lines.push("  }");
    }
  } else {
    lines.push("  satellite: {");
    lines.push(`    id: "${params.satelliteId}",`);
    lines.push(`    source: "${params.source}"`);
    if (params.orbiterId) {
      lines.push("  },");
    } else {
      lines.push("  }");
    }
  }

  if (params.orbiterId) {
    lines.push("  orbiter: {");
    if (params.multiEnv) {
      lines.push("    ids: {");
      lines.push(`      production: "${params.orbiterId}"`);
      lines.push("    }");
    } else {
      lines.push(`    id: "${params.orbiterId}"`);
    }
    lines.push("  }");
  }

  lines.push("});");
  return lines.join("\n");
}

function generateJavaScriptConfig(params: ConfigInitParams): string {
  const lines: string[] = [];
  lines.push('const { defineConfig } = require("@junobuild/config");');
  lines.push("");
  lines.push("module.exports = defineConfig({");

  if (params.multiEnv) {
    const stagingId = params.stagingSatelliteId ?? "bbbbb-ccccc-ddddd-eeeee-cai";
    lines.push("  satellite: {");
    lines.push("    ids: {");
    lines.push(`      production: "${params.satelliteId}",`);
    lines.push(`      staging: "${stagingId}"`);
    lines.push("    },");
    lines.push(`    source: "${params.source}"`);
    if (params.orbiterId) {
      lines.push("  },");
    } else {
      lines.push("  }");
    }
  } else {
    lines.push("  satellite: {");
    lines.push(`    id: "${params.satelliteId}",`);
    lines.push(`    source: "${params.source}"`);
    if (params.orbiterId) {
      lines.push("  },");
    } else {
      lines.push("  }");
    }
  }

  if (params.orbiterId) {
    lines.push("  orbiter: {");
    if (params.multiEnv) {
      lines.push("    ids: {");
      lines.push(`      production: "${params.orbiterId}"`);
      lines.push("    }");
    } else {
      lines.push(`    id: "${params.orbiterId}"`);
    }
    lines.push("  }");
  }

  lines.push("});");
  return lines.join("\n");
}

function generateJsonConfig(params: ConfigInitParams): string {
  const config: Record<string, unknown> = {};

  if (params.multiEnv) {
    const stagingId = params.stagingSatelliteId ?? "bbbbb-ccccc-ddddd-eeeee-cai";
    config.satellite = {
      ids: {
        production: params.satelliteId,
        staging: stagingId
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
      description: "Generate a juno.config file content (TypeScript, JavaScript, or JSON). Returns the config text with instructions on where to save it. The agent should write this content to the project root. Then run juno_config_apply to push the config to your satellite.",
      inputSchema: configInitSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params) => {
      const { content, ext, lang } = generateConfigContent(params);
      const filename = `juno.config.${ext}`;

      const text = `## Juno Config (${ext.toUpperCase()})\n\nSave this as \`${filename}\` in your project root:\n\n\`\`\`${lang}\n${content}\n\`\`\`\n\nThen run \`juno config apply\` to apply the configuration to your satellite.\n\n**Note:** Replace the placeholder satellite ID with your actual ID from the [Juno Console](https://console.juno.build).`;

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
      const pm = params.packageManager;
      const args = [params.directory];
      if (params.template) args.push("--template", params.template);

      const cmd = `${pm} create juno@latest ${args.join(" ")}`;
      const result = await execCommand(cmd, 120_000);
      const { text, isError } = formatResponse(result, "Create Project");
      return { content: [{ type: "text", text }], isError };
    }
  );
}
