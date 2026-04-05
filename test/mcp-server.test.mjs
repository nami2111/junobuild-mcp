import { spawn } from "node:child_process";
import { join } from "node:path";
import { existsSync, rmSync, mkdirSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

const MCP_SERVER = join(process.cwd(), "dist/index.js");
const TEST_DIR = join(tmpdir(), `juno-mcp-test-${randomUUID()}`);
const PROJECT_DIR = join(TEST_DIR, "my-juno-app");

mkdirSync(TEST_DIR, { recursive: true });

function sendRequest(server, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.random().toString(36).slice(2);
    const message = JSON.stringify({ jsonrpc: "2.0", id, method, params });
    server.stdin.write(message + "\n");

    const handler = (data) => {
      const lines = data.toString().split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const msg = JSON.parse(line);
          if (msg.id === id) {
            server.stdout.removeListener("data", handler);
            resolve(msg);
          }
        } catch {
          // ignore non-JSON lines
        }
      }
    };

    server.stdout.on("data", handler);
    setTimeout(() => {
      server.stdout.removeListener("data", handler);
      reject(new Error("Request timed out"));
    }, 300_000);
  });
}

async function main() {
  console.log("Starting MCP server...");
  const server = spawn("node", [MCP_SERVER], {
    stdio: ["pipe", "pipe", "pipe"],
    cwd: TEST_DIR,
    env: { ...process.env, FORCE_COLOR: "0" }
  });

  server.stderr.on("data", (data) => {
    console.error("Server stderr:", data.toString().slice(0, 200));
  });

  server.on("error", (err) => {
    console.error("Server error:", err.message);
    process.exit(1);
  });

  // Wait for server to be ready
  await new Promise((resolve) => setTimeout(resolve, 2000));

  try {
    // Initialize
    console.log("\n1. Initializing MCP server...");
    const initResult = await sendRequest(server, "initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client", version: "1.0.0" }
    });
    console.log("   Protocol:", initResult.result?.protocolVersion);
    console.log("   Server:", JSON.stringify(initResult.result?.serverInfo));

    // Send initialized notification
    server.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");

    // List tools
    console.log("\n2. Listing tools...");
    const toolsResult = await sendRequest(server, "tools/list", {});
    const toolNames = toolsResult.result?.tools?.map((t) => t.name) || [];
    console.log(`   Found ${toolNames.length} tools`);
    console.log("   juno_create_project present:", toolNames.includes("juno_create_project"));

    // Call juno_create_project
    console.log("\n3. Calling juno_create_project...");
    const callResult = await sendRequest(server, "tools/call", {
      name: "juno_create_project",
      arguments: {
        directory: "my-juno-app",
        template: "react-ts-starter",
        packageManager: "npm",
        serverlessFunctions: "none",
        githubAction: false
      }
    });

    const output = callResult.result?.content?.[0]?.text || "";
    const isError = callResult.result?.isError || false;

    console.log("   isError:", isError);
    console.log("   Output (first 500 chars):", output.slice(0, 500));

    // Check if project was created
    console.log("\n4. Verifying project creation...");
    console.log("   Project dir exists:", existsSync(PROJECT_DIR));

    if (existsSync(PROJECT_DIR)) {
      const files = readdirSync(PROJECT_DIR);
      console.log("   Project files:", files.slice(0, 10).join(", "));
      console.log("   package.json exists:", existsSync(join(PROJECT_DIR, "package.json")));
    }

    console.log("\n=== TEST RESULT ===");
    if (!isError && existsSync(PROJECT_DIR) && existsSync(join(PROJECT_DIR, "package.json"))) {
      console.log("PASSED");
    } else {
      console.log("FAILED");
      console.log("Full output:", output);
    }
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    server.kill();
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

main();
