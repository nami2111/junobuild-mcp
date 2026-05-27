import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchJunoDoc, getAlternatePath } from "../docs-catalog.js";
import { registerJunoTools, type RegisteredJunoTool } from "../registered-tool.js";
import { junoDocsSchema } from "../schemas/docs.js";
import type { TopicKey } from "../schemas/docs.js";

export { getAlternatePath };

export async function handleDocFetch(
  params: Record<string, unknown>
): Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }> {
  const topicKey = params.topic as string;

  try {
    const doc = await fetchJunoDoc(params.topic as TopicKey);
    const cacheLabel = doc.cached ? " (cached)" : "";
    const sourceLine = doc.cached ? "" : `\n\nSource: ${doc.sourceUrl}`;

    return {
      content: [
        {
          type: "text",
          text: `# Juno Docs: ${doc.topicKey}${cacheLabel}${sourceLine}\n\n${doc.content}`
        }
      ]
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Failed to fetch documentation for "${topicKey}": ${message}`
        }
      ],
      isError: true
    };
  }
}

export const docsTools: readonly RegisteredJunoTool[] = [
  {
    name: "juno_docs",
    title: "Juno Documentation",
    description:
      "Fetch Juno documentation from GitHub repo. Full docs: https://github.com/junobuild/docs/tree/main/docs. Topics use underscore naming matching folder hierarchy (e.g. build_authentication, reference_cli_functions_build).",
    inputSchema: junoDocsSchema.shape,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    },
    handler: async (params: Record<string, unknown>) => handleDocFetch(params)
  }
];

export function registerDocsTools(server: McpServer): void {
  registerJunoTools(server, docsTools);
}
