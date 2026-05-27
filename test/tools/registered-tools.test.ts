import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it, vi } from "vitest";
import { changesTools } from "../../src/tools/changes.js";
import { configTools } from "../../src/tools/config.js";
import { docsTools } from "../../src/tools/docs.js";
import { functionsTools } from "../../src/tools/functions.js";
import {
  handleHostingClear,
  handleHostingDeploy,
  handleHostingPrune,
  hostingTools,
  registerHostingTools,
} from "../../src/tools/hosting.js";
import { identityTools } from "../../src/tools/identity.js";
import { projectTools } from "../../src/tools/project.js";

const allTools = [
  ...identityTools,
  ...configTools,
  ...hostingTools,
  ...functionsTools,
  ...changesTools,
  ...projectTools,
  ...docsTools,
];

describe("registered Juno tools", () => {
  it("uses the expected public tool names once", () => {
    const names = allTools.map((tool) => tool.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toEqual([
      "juno_version",
      "juno_run",
      "juno_status",
      "juno_config_init",
      "juno_config_apply",
      "juno_hosting_deploy",
      "juno_hosting_clear",
      "juno_hosting_prune",
      "juno_functions_build",
      "juno_functions_eject",
      "juno_functions_publish",
      "juno_functions_upgrade",
      "juno_changes_list",
      "juno_changes_apply",
      "juno_changes_reject",
      "juno_create_project",
      "juno_docs",
    ]);
  });

  it("binds hosting public tools to their matching handlers", () => {
    expect(
      hostingTools.find((tool) => tool.name === "juno_hosting_deploy")?.handler
    ).toBe(handleHostingDeploy);
    expect(
      hostingTools.find((tool) => tool.name === "juno_hosting_clear")?.handler
    ).toBe(handleHostingClear);
    expect(
      hostingTools.find((tool) => tool.name === "juno_hosting_prune")?.handler
    ).toBe(handleHostingPrune);
  });

  it("registers through the public MCP seam with the declared metadata", () => {
    const registerTool = vi.fn();
    const server = { registerTool } as unknown as McpServer;

    registerHostingTools(server);

    expect(registerTool).toHaveBeenCalledTimes(3);
    expect(registerTool).toHaveBeenNthCalledWith(
      1,
      "juno_hosting_deploy",
      expect.objectContaining({
        title: "Juno Hosting Deploy",
        inputSchema: expect.any(Object),
        annotations: expect.objectContaining({ openWorldHint: true }),
      }),
      handleHostingDeploy
    );
    expect(registerTool).toHaveBeenNthCalledWith(
      3,
      "juno_hosting_prune",
      expect.objectContaining({
        title: "Juno Hosting Prune",
        inputSchema: expect.any(Object),
        annotations: expect.objectContaining({ destructiveHint: true }),
      }),
      handleHostingPrune
    );
  });
});
