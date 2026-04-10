import { spawn } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, rmSync } from "node:fs";

const MCP_SERVER = join(process.cwd(), "dist/index.js");
const TEST_DIR = join(tmpdir(), `juno-mcp-identity-test-${randomUUID()}`);
const NODE_PATH = process.execPath;

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
    }, 30_000);
  });
}

async function testJunoVersion(server) {
  console.log("\n1. Testing juno_version...");
  const callResult = await sendRequest(server, "tools/call", {
    name: "juno_version",
    arguments: {}
  });

  const output = callResult.result?.content?.[0]?.text || "";
  const isError = callResult.result?.isError || false;

  console.log("   isError:", isError);
  console.log("   Output:", output.slice(0, 200));

  if (!isError && output.length > 0) {
    console.log("   PASSED");
    return true;
  }
  console.log("   FAILED");
  return false;
}

async function testJunoWhoami(server) {
  console.log("\n2. Testing juno_whoami...");
  const callResult = await sendRequest(server, "tools/call", {
    name: "juno_whoami",
    arguments: {}
  });

  const output = callResult.result?.content?.[0]?.text || "";
  const isError = callResult.result?.isError || false;

  console.log("   isError:", isError);
  console.log("   Output:", output.slice(0, 300));

  // whoami may fail if not authenticated, which is expected
  // We just verify the tool responds correctly (either with profile info or auth error)
  if (output.length > 0) {
    console.log("   PASSED (responded correctly)");
    return true;
  }
  console.log("   FAILED");
  return false;
}

async function testJunoOpen(server) {
  console.log("\n3. Testing juno_open...");
  const callResult = await sendRequest(server, "tools/call", {
    name: "juno_open",
    arguments: {}
  });

  const output = callResult.result?.content?.[0]?.text || "";
  const isError = callResult.result?.isError || false;

  console.log("   isError:", isError);
  console.log("   Output:", output.slice(0, 300));

  if (output.length > 0) {
    console.log("   PASSED");
    return true;
  }
  console.log("   FAILED");
  return false;
}

async function testJunoRun(server) {
  console.log("\n4. Testing juno_run...");
  const callResult = await sendRequest(server, "tools/call", {
    name: "juno_run",
    arguments: { src: "nonexistent.js" }
  });

  const output = callResult.result?.content?.[0]?.text || "";
  const isError = callResult.result?.isError || false;

  console.log("   isError:", isError);
  console.log("   Output:", output.slice(0, 300));

  // We expect an error since the file doesn't exist, but the tool should respond
  if (output.length > 0) {
    console.log("   PASSED (responded correctly)");
    return true;
  }
  console.log("   FAILED");
  return false;
}

async function main() {
  console.log("Starting MCP server for identity tests...");
  const server = spawn(NODE_PATH, [MCP_SERVER], {
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
    console.log("Initializing MCP server...");
    await sendRequest(server, "initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client", version: "1.0.0" }
    });

    // Send initialized notification
    server.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");

    // Run tests
    const results = [];
    results.push(await testJunoVersion(server));
    results.push(await testJunoWhoami(server));
    results.push(await testJunoOpen(server));
    results.push(await testJunoRun(server));

    console.log("\n=== SUMMARY ===");
    console.log(`Passed: ${results.filter(Boolean).length}/${results.length}`);

    if (results.every(Boolean)) {
      console.log("ALL TESTS PASSED");
    } else {
      console.log("SOME TESTS FAILED");
      process.exitCode = 1;
    }
  } catch (err) {
    console.error("Error:", err.message);
    process.exitCode = 1;
  } finally {
    server.kill();
  }
}

main();
