import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execCli, formatResponse } from "../cli.js";
import { emulatorStartSchema, emulatorStopSchema, emulatorClearSchema, emulatorWaitSchema } from "../schemas/emulator.js";
import { EMULATOR_START_TIMEOUT } from "../constants.js";

export function registerEmulatorTools(server: McpServer): void {
  server.registerTool(
    "juno_emulator_start",
    {
      title: "Juno Emulator Start",
      description: "Start the local Juno emulator for development. The emulator provides a production-like environment with full support for data, authentication, storage, and serverless functions. Optionally specify language for building functions and enable watch mode.",
      inputSchema: emulatorStartSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async (params) => {
      const args: string[] = [];
      if (params.lang) args.push("-l", params.lang);
      if (params.cargoPath) args.push("--cargo-path", params.cargoPath);
      if (params.sourcePath) args.push("--source-path", params.sourcePath);
      const result = await execCli("emulator", ["start", ...args], undefined, EMULATOR_START_TIMEOUT);
      const { text, isError } = formatResponse(result, "Emulator Start");
      return { content: [{ type: "text", text }], isError };
    }
  );

  server.registerTool(
    "juno_emulator_stop",
    {
      title: "Juno Emulator Stop",
      description: "Stop the running local Juno emulator network.",
      inputSchema: emulatorStopSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async () => {
      const result = await execCli("emulator", ["stop"]);
      const { text, isError } = formatResponse(result, "Emulator Stop");
      return { content: [{ type: "text", text }], isError };
    }
  );

  server.registerTool(
    "juno_emulator_clear",
    {
      title: "Juno Emulator Clear",
      description: "Clear the local emulator state including its volume and container. This resets all local data to a clean state.",
      inputSchema: emulatorClearSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async () => {
      const result = await execCli("emulator", ["clear"]);
      const { text, isError } = formatResponse(result, "Emulator Clear");
      return { content: [{ type: "text", text }], isError };
    }
  );

  server.registerTool(
    "juno_emulator_wait",
    {
      title: "Juno Emulator Wait",
      description: "Wait until the emulator is fully ready and accepting connections. Useful after starting the emulator to ensure it's operational before running other commands.",
      inputSchema: emulatorWaitSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params) => {
      const args = ["--timeout", String(params.timeout)];
      const result = await execCli("emulator", ["wait", ...args], undefined, params.timeout + 5000);
      const { text, isError } = formatResponse(result, "Emulator Wait");
      return { content: [{ type: "text", text }], isError };
    }
  );
}
