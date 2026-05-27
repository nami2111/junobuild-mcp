import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  AnySchema,
  ZodRawShapeCompat,
} from "@modelcontextprotocol/sdk/server/zod-compat.js";
import type {
  CallToolResult,
  ToolAnnotations,
} from "@modelcontextprotocol/sdk/types.js";

type RegisteredToolInputSchema = ZodRawShapeCompat | AnySchema | undefined;
type RegisteredToolHandler = (
  params: Record<string, unknown>,
  extra?: Record<string, unknown>
) => CallToolResult | Promise<CallToolResult>;

export interface RegisteredJunoTool {
  annotations: ToolAnnotations;
  description: string;
  handler: RegisteredToolHandler;
  inputSchema: RegisteredToolInputSchema;
  name: string;
  title: string;
}

export function registerJunoTools(
  server: McpServer,
  tools: readonly RegisteredJunoTool[]
): void {
  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: tool.annotations,
      },
      tool.handler as Parameters<McpServer["registerTool"]>[2]
    );
  }
}
