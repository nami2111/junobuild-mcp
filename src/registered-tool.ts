import type {
  CallToolResult,
  McpServer,
  ServerContext,
  ToolAnnotations,
} from "@modelcontextprotocol/server";
import { type ZodRawShape, z } from "zod";

type RegisteredToolInputSchema = ZodRawShape;
type RegisteredToolHandler = (
  params: Record<string, unknown>,
  ctx: ServerContext
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
  // Deterministic order for client caching + LLM prompt-cache hit rate.
  const sorted = [...tools].sort((a, b) => a.name.localeCompare(b.name));
  for (const tool of sorted) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: z.object(tool.inputSchema),
        annotations: tool.annotations,
      },
      tool.handler
    );
  }
}
