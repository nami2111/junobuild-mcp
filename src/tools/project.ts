import { readFile, rename, writeFile } from "node:fs/promises";
import type { McpServer } from "@modelcontextprotocol/server";
import { execCommandNonInteractive } from "../executor.js";
import {
  type RegisteredJunoTool,
  registerJunoTools,
} from "../registered-tool.js";
import { createProjectSchema } from "../schemas/project.js";

export async function handleCreateProject(
  params: Record<string, unknown>
): Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }> {
  try {
    const dir = params.directory as string;
    const template = (params.template as string) || "react-ts-starter";
    const pm = (params.packageManager as string) || "npm";

    const TEMPLATE_MAP: Record<string, string> = {
      "react-ts-starter": "react --template-ts",
      "react-javascript": "react",
      "nextjs-starter": "next",
      "sveltekit-starter": "svelte",
      "angular-starter": "angular",
      "vue-starter": "vue",
    };

    const viteTemplate = TEMPLATE_MAP[template] || "react --template-ts";
    const sourceDir = `src-${Date.now()}`;

    const templateParts = viteTemplate.split(" ");
    const result = await execCommandNonInteractive(
      "npm",
      [
        "create",
        "vite@latest",
        sourceDir,
        "--",
        "--template",
        ...templateParts,
      ],
      120_000
    );

    if (result.exitCode !== 0) {
      return {
        content: [{ type: "text", text: result.stderr || result.stdout }],
        isError: true,
      };
    }

    await rename(sourceDir, dir);

    const packageJsonPath = `${dir}/package.json`;

    const pkg = JSON.parse(await readFile(packageJsonPath, "utf-8"));
    pkg.name = dir;
    await writeFile(packageJsonPath, JSON.stringify(pkg, null, 2));

    const deps = ["@junobuild/core"];
    const failedDeps: string[] = [];
    for (const dep of deps) {
      const addResult = await execCommandNonInteractive(
        pm,
        ["add", dep],
        120_000,
        dir
      );
      if (addResult.exitCode !== 0) {
        failedDeps.push(dep);
      }
    }

    const configContent = `import type { SatelliteConfig } from "@junobuild/config";

export default {
  satellite: {
    source: "dist"
  }
} satisfies SatelliteConfig;
`;
    await writeFile(`${dir}/juno.config.ts`, configContent);

    let output = `Project "${dir}" created with ${template} template.\n`;
    output += "\n## Next Steps\n";
    output += `1. cd ${dir} && ${pm} install\n`;
    output +=
      "2. Replace placeholder satellite ID in juno.config.ts with your real ID\n";
    output += `3. ${pm} run dev\n`;
    output += "4. juno emulator start  # in another terminal\n";
    output += "5. juno hosting deploy --mode development\n";
    output += `\nFor production: ${pm} run build && juno hosting deploy\n`;

    if (failedDeps.length > 0) {
      output += `\n**Warning:** Failed to install: ${failedDeps.join(", ")}. You may need to run \`${pm} install\` manually.\n`;
    }

    return {
      content: [{ type: "text", text: output }],
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Failed to create project: ${message}` }],
      isError: true,
    };
  }
}

export const projectTools: readonly RegisteredJunoTool[] = [
  {
    name: "juno_create_project",
    title: "Juno Create Project",
    description:
      "Scaffold a new Juno project. Uses Vite to create the frontend, then adds Juno SDK and config. Does NOT use the interactive create-juno CLI.",
    inputSchema: createProjectSchema.shape,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    handler: async (params: Record<string, unknown>) =>
      handleCreateProject(params),
  },
];

export function registerProjectTools(server: McpServer): void {
  registerJunoTools(server, projectTools);
}
