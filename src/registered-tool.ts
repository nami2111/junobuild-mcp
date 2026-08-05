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
  for (const tool of tools) {
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
