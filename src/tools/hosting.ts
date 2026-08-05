import { type Dirent, existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { McpServer } from "@modelcontextprotocol/server";
import { buildInstantChangeArgs } from "../change-workflow.js";
import { environmentContext } from "../juno-context.js";
import {
  type RegisteredJunoTool,
  registerJunoTools,
} from "../registered-tool.js";
import {
  hostingClearSchema,
  hostingDeploySchema,
  hostingPruneSchema,
} from "../schemas/hosting.js";
import { makeToolHandler } from "../tool-handler.js";

const JUNO_CONFIG_NAMES = [
  "juno.config.ts",
  "juno.config.json",
  "juno.config.js",
];
const SOURCE_PATTERN = /["']?source["']?\s*[:=]\s*["']([^"']+)["']/;

/**
 * Cap the upload batch at the number of source files when the project's
 * `source` dir (from juno.config) is detectable — a batch above the file
 * count wastes nothing but batching a 5-file dist into 50-way parallelism is
 * pure overhead. Falls back to the given batch when the config or dir can't
 * be read (scanning is best-effort, never fatal).
 */
export function tuneBatch(batch: number, cwd = process.cwd()): number {
  try {
    const sourceDir = sourceDirFromConfig(cwd);
    if (!(sourceDir && existsSync(sourceDir))) {
      return batch;
    }
    const files = countFiles(sourceDir);
    if (files === 0) {
      return batch;
    }
    return Math.max(1, Math.min(batch, files));
  } catch {
    return batch;
  }
}

function sourceDirFromConfig(cwd: string): string | undefined {
  for (const name of JUNO_CONFIG_NAMES) {
    const path = join(cwd, name);
    if (!existsSync(path)) {
      continue;
    }
    const match = readFileSync(path, "utf-8").match(SOURCE_PATTERN);
    if (match?.[1]) {
      return join(cwd, match[1]);
    }
  }
  return;
}

function countFiles(dir: string): number {
  let count = 0;
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }
    let entries: Dirent[];
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return count;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name.startsWith(".")) {
          continue;
        }
        stack.push(join(current, entry.name));
      } else if (entry.isFile()) {
        count++;
      }
    }
  }
  return count;
}

export function buildHostingDeployArgs(params: {
  batch: number;
  clear?: boolean;
  prune?: boolean;
  immediate?: boolean;
  keepStaged?: boolean;
  noApply?: boolean;
  config?: boolean;
  retry?: boolean;
  progress?: boolean;
}): string[] {
  const args: string[] = [];
  args.push("--batch", String(params.batch));
  if (params.clear) {
    args.push("--clear");
  }
  if (params.prune) {
    args.push("--prune");
  }
  args.push(...buildInstantChangeArgs(params));
  if (params.config) {
    args.push("--config");
  }
  return args;
}

export function buildHostingClearArgs(params: { fullPath?: string }): string[] {
  const args: string[] = [];
  if (params.fullPath) {
    args.push("-f", params.fullPath);
  }
  return args;
}

export function buildHostingPruneArgs(params: {
  batch: number;
  dryRun?: boolean;
}): string[] {
  const args: string[] = [];
  args.push("--batch", String(params.batch));
  if (params.dryRun) {
    args.push("--dry-run");
  }
  return args;
}

export const handleHostingDeploy = makeToolHandler({
  command: "hosting",
  subcommand: "deploy",
  label: "Hosting Deploy",
  context: environmentContext,
  argsFromParams: (p) => {
    const { batch, ...rest } = p as {
      batch: number;
      clear?: boolean;
      prune?: boolean;
      immediate?: boolean;
      keepStaged?: boolean;
      noApply?: boolean;
      config?: boolean;
      retry?: boolean;
      progress?: boolean;
    };
    return buildHostingDeployArgs({ batch: tuneBatch(batch), ...rest });
  },
  retryConfig: { maxRetries: 3, baseDelay: 1000, maxDelay: 10_000 },
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

export const handleHostingClear = makeToolHandler({
  command: "hosting",
  subcommand: "clear",
  label: "Hosting Clear",
  context: environmentContext,
  argsFromParams: (p) => buildHostingClearArgs(p as { fullPath?: string }),
});

export const handleHostingPrune = makeToolHandler({
  command: "hosting",
  subcommand: "prune",
  label: "Hosting Prune",
  context: environmentContext,
  argsFromParams: (p) =>
    buildHostingPruneArgs(p as { batch: number; dryRun?: boolean }),
});

export const hostingTools: readonly RegisteredJunoTool[] = [
  {
    name: "juno_hosting_deploy",
    title: "Juno Hosting Deploy",
    description:
      "Deploy your app's frontend files to your satellite. Reads from the `source` directory defined in juno.config and uploads all assets. Supports batch parallelism, clearing before deploy, and pruning stale files after.",
    inputSchema: hostingDeploySchema.shape,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    handler: handleHostingDeploy,
  },
  {
    name: "juno_hosting_clear",
    title: "Juno Hosting Clear",
    description:
      "Remove frontend files (JS, HTML, CSS, etc.) from your satellite. This does NOT remove user-uploaded files from custom collections — only the deployed app assets.",
    inputSchema: hostingClearSchema.shape,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    },
    handler: handleHostingClear,
  },
  {
    name: "juno_hosting_prune",
    title: "Juno Hosting Prune",
    description:
      "Remove stale frontend files from your satellite that are no longer in your build output. Use --dry-run to preview which files would be deleted without actually deleting them.",
    inputSchema: hostingPruneSchema.shape,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    },
    handler: handleHostingPrune,
  },
];

export function registerHostingTools(server: McpServer): void {
  registerJunoTools(server, hostingTools);
}
