import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { junoDocsSchema, TOPICS } from "../schemas/docs.js";
import type { TopicKey } from "../schemas/docs.js";
import { CHARACTER_LIMIT } from "../constants.js";

const BASE_URL = "https://raw.githubusercontent.com/junobuild/docs/main/docs";
const CACHE_TTL_MS = 60 * 60 * 1000;

interface CacheEntry {
  content: string;
  expiresAt: number;
}

const docCache = new Map<string, CacheEntry>();
const MAX_CACHE_SIZE = 50;

function cleanupExpired(): void {
  const now = Date.now();
  for (const [key, entry] of docCache) {
    if (entry.expiresAt < now) {
      docCache.delete(key);
    }
  }
  while (docCache.size > MAX_CACHE_SIZE) {
    const oldest = docCache.keys().next().value;
    if (oldest) docCache.delete(oldest);
  }
}

function getAlternatePath(path: string): string {
  return path.endsWith(".mdx") ? path.replace(/\.mdx$/, ".md") : path.replace(/\.md$/, ".mdx");
}

async function fetchDoc(path: string): Promise<{ content: string; url: string }> {
  const url = `${BASE_URL}${path}`;
  let response = await fetch(url);

  if (!response.ok && response.status === 404) {
    const alternatePath = getAlternatePath(path);
    const alternateUrl = `${BASE_URL}${alternatePath}`;
    response = await fetch(alternateUrl);
    if (response.ok) {
      return { content: await response.text(), url: alternateUrl };
    }
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return { content: await response.text(), url };
}

export function registerDocsTools(server: McpServer): void {
  server.registerTool(
    "juno_docs",
    {
      title: "Juno Documentation",
      description:
        "Fetch Juno documentation from GitHub repo. Full docs: https://github.com/junobuild/docs/tree/main/docs. Topics use underscore naming matching folder hierarchy (e.g., build_authentication, reference_cli_functions_build).",
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
      const topicKey = params.topic as string;

      cleanupExpired();

      const cached = docCache.get(topicKey);
      if (cached && cached.expiresAt > Date.now()) {
        return {
          content: [
            {
              type: "text",
              text: `# Juno Docs: ${topicKey} (cached)\n\n${cached.content}`
            }
          ]
        };
      }

      try {
        const { content, url } = await fetchDoc(path);

        let text = content;
        if (text.length > CHARACTER_LIMIT) {
          text = text.slice(0, CHARACTER_LIMIT) + "\n...(truncated)";
        }

        docCache.set(topicKey, {
          content: text,
          expiresAt: Date.now() + CACHE_TTL_MS
        });

        return {
          content: [
            {
              type: "text",
              text: `# Juno Docs: ${topicKey}\n\nSource: ${url}\n\n${text}`
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
  );
}
