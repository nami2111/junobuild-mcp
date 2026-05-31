import type {
  McpServer,
  ToolCallback,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShapeCompat } from "@modelcontextprotocol/sdk/server/zod-compat.js";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";

type RegisteredToolInputSchema = ZodRawShapeCompat;
type RegisteredToolHandler = ToolCallback<ZodRawShapeCompat>;

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
      tool.handler
    );
  }
}
