import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { junoDocsSchema, TOPICS } from "../schemas/docs.js";
import type { TopicKey } from "../schemas/docs.js";
import { CHARACTER_LIMIT } from "../constants.js";

const BASE_URL = "https://juno.build";

export function registerDocsTools(server: McpServer): void {
  server.registerTool(
    "juno_docs",
    {
      title: "Juno Documentation",
      description: "Fetch Juno documentation from juno.build. Provides detailed guides on authentication, datastore, storage, hosting, serverless functions, CLI usage, configuration, and more. Use this to learn how Juno works before running CLI commands.",
      inputSchema: junoDocsSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params) => {
      const path = TOPICS[params.topic as TopicKey];
      const url = `${BASE_URL}${path}`;

      try {
        const response = await fetch(url);
        if (!response.ok) {
          return {
            content: [{
              type: "text",
              text: `Failed to fetch documentation for "${params.topic}" from ${url} (HTTP ${response.status})`
            }],
            isError: true
          };
        }

        let text = await response.text();
        if (text.length > CHARACTER_LIMIT) {
          text = text.slice(0, CHARACTER_LIMIT) + "\n...(truncated)";
        }

        return {
          content: [{
            type: "text",
            text: `# Juno Docs: ${params.topic}\n\n${text}`
          }]
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{
            type: "text",
            text: `Failed to fetch documentation: ${message}`
          }],
          isError: true
        };
      }
    }
  );
}
