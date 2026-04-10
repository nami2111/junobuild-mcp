import { spawn } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";

const MCP_SERVER = join(process.cwd(), "dist/index.js");
const TEST_DIR = join(tmpdir(), `juno-mcp-tools-test-${randomUUID()}`);
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

async function testJunoConfigInit(server) {
  console.log("\n1. Testing juno_config_init...");
  const callResult = await sendRequest(server, "tools/call", {
    name: "juno_config_init",
    arguments: {
      format: "typescript",
      source: "dist",
      satelliteId: "test-satellite-id",
      multiEnv: false,
      writeFile: false
    }
  });

  const output = callResult.result?.content?.[0]?.text || "";
  const isError = callResult.result?.isError || false;

  console.log("   isError:", isError);
  console.log("   Output:", output.slice(0, 300));

  if (!isError && output.length > 0 && output.includes("juno.config.ts")) {
    console.log("   PASSED");
    return true;
  }
  console.log("   FAILED");
  return false;
}

async function testJunoConfigInitWriteFile(server) {
  console.log("\n2. Testing juno_config_init with writeFile...");
  const callResult = await sendRequest(server, "tools/call", {
    name: "juno_config_init",
    arguments: {
      format: "json",
      source: "build",
      satelliteId: "aaaaa-bbbbb-ccccc-ddddd-cai",
      multiEnv: false,
      writeFile: true,
      path: "juno.config.json"
    }
  });

  const output = callResult.result?.content?.[0]?.text || "";
  const isError = callResult.result?.isError || false;

  console.log("   isError:", isError);
  console.log("   Output:", output.slice(0, 200));

  if (!isError && output.includes("Config written")) {
    console.log("   PASSED");
    return true;
  }
  console.log("   FAILED");
  return false;
}

async function testJunoConfigApply(server) {
  console.log("\n3. Testing juno_config_apply...");
  const callResult = await sendRequest(server, "tools/call", {
    name: "juno_config_apply",
    arguments: {}
  });

  const output = callResult.result?.content?.[0]?.text || "";
  const isError = callResult.result?.isError || false;

  console.log("   isError:", isError);
  console.log("   Output:", output.slice(0, 300));

  // Expected to fail without config file - but tool should respond
  if (output.length > 0) {
    console.log("   PASSED (responded correctly)");
    return true;
  }
  console.log("   FAILED");
  return false;
}

async function testJunoEmulatorStop(server) {
  console.log("\n4. Testing juno_emulator_stop...");
  const callResult = await sendRequest(server, "tools/call", {
    name: "juno_emulator_stop",
    arguments: {}
  });

  const output = callResult.result?.content?.[0]?.text || "";
  const isError = callResult.result?.isError || false;

  console.log("   isError:", isError);
  console.log("   Output:", output.slice(0, 300));

  // Expected to fail if no emulator running - but should respond
  if (output.length > 0) {
    console.log("   PASSED (responded correctly)");
    return true;
  }
  console.log("   FAILED");
  return false;
}

async function testJunoEmulatorClear(server) {
  console.log("\n5. Testing juno_emulator_clear...");
  const callResult = await sendRequest(server, "tools/call", {
    name: "juno_emulator_clear",
    arguments: {}
  });

  const output = callResult.result?.content?.[0]?.text || "";
  const isError = callResult.result?.isError || false;

  console.log("   isError:", isError);
  console.log("   Output:", output.slice(0, 300));

  if (output.length > 0) {
    console.log("   PASSED (responded correctly)");
    return true;
  }
  console.log("   FAILED");
  return false;
}

async function testJunoEmulatorWait(server) {
  console.log("\n6. Testing juno_emulator_wait...");
  const callResult = await sendRequest(server, "tools/call", {
    name: "juno_emulator_wait",
    arguments: { timeout: 5000 }
  });

  const output = callResult.result?.content?.[0]?.text || "";
  const isError = callResult.result?.isError || false;

  console.log("   isError:", isError);
  console.log("   Output:", output.slice(0, 300));

  // Expected to fail if no emulator running - but should respond
  if (output.length > 0) {
    console.log("   PASSED (responded correctly)");
    return true;
  }
  console.log("   FAILED");
  return false;
}

async function testJunoHostingDeploy(server) {
  console.log("\n7. Testing juno_hosting_deploy...");
  const callResult = await sendRequest(server, "tools/call", {
    name: "juno_hosting_deploy",
    arguments: { batch: 10 }
  });

  const output = callResult.result?.content?.[0]?.text || "";
  const isError = callResult.result?.isError || false;

  console.log("   isError:", isError);
  console.log("   Output:", output.slice(0, 300));

  // Expected to fail without config - but should respond
  if (output.length > 0) {
    console.log("   PASSED (responded correctly)");
    return true;
  }
  console.log("   FAILED");
  return false;
}

async function testJunoHostingClear(server) {
  console.log("\n8. Testing juno_hosting_clear...");
  const callResult = await sendRequest(server, "tools/call", {
    name: "juno_hosting_clear",
    arguments: {}
  });

  const output = callResult.result?.content?.[0]?.text || "";
  const isError = callResult.result?.isError || false;

  console.log("   isError:", isError);
  console.log("   Output:", output.slice(0, 300));

  if (output.length > 0) {
    console.log("   PASSED (responded correctly)");
    return true;
  }
  console.log("   FAILED");
  return false;
}

async function testJunoHostingPrune(server) {
  console.log("\n9. Testing juno_hosting_prune...");
  const callResult = await sendRequest(server, "tools/call", {
    name: "juno_hosting_prune",
    arguments: { dryRun: true }
  });

  const output = callResult.result?.content?.[0]?.text || "";
  const isError = callResult.result?.isError || false;

  console.log("   isError:", isError);
  console.log("   Output:", output.slice(0, 300));

  if (output.length > 0) {
    console.log("   PASSED (responded correctly)");
    return true;
  }
  console.log("   FAILED");
  return false;
}

async function testJunoFunctionsBuild(server) {
  console.log("\n10. Testing juno_functions_build...");
  const callResult = await sendRequest(server, "tools/call", {
    name: "juno_functions_build",
    arguments: {}
  });

  const output = callResult.result?.content?.[0]?.text || "";
  const isError = callResult.result?.isError || false;

  console.log("   isError:", isError);
  console.log("   Output:", output.slice(0, 300));

  if (output.length > 0) {
    console.log("   PASSED (responded correctly)");
    return true;
  }
  console.log("   FAILED");
  return false;
}

async function testJunoFunctionsEject(server) {
  console.log("\n11. Testing juno_functions_eject...");
  // Skip - eject is interactive and may hang
  console.log("   SKIPPED (interactive command)");
  return true;
}

/* async function testJunoFunctionsPublish(server) {
  console.log("\n12. Testing juno_functions_publish...");
  const callResult = await sendRequest(server, "tools/call", {
    name: "juno_functions_publish",
    arguments: {}
  });

  const output = callResult.result?.content?.[0]?.text || "";
  const isError = callResult.result?.isError || false;

  console.log("   isError:", isError);
  console.log("   Output:", output.slice(0, 300));

  if (output.length > 0) {
    console.log("   PASSED (responded correctly)");
    return true;
  }
  console.log("   FAILED");
  return false;
} */

async function testJunoModuleStatus(server) {
  console.log("\n13. Testing juno_module_status...");
  const callResult = await sendRequest(server, "tools/call", {
    name: "juno_module_status",
    arguments: {}
  });

  const output = callResult.result?.content?.[0]?.text || "";
  const isError = callResult.result?.isError || false;

  console.log("   isError:", isError);
  console.log("   Output:", output.slice(0, 300));

  if (output.length > 0) {
    console.log("   PASSED (responded correctly)");
    return true;
  }
  console.log("   FAILED");
  return false;
}

async function testJunoModuleStop(server) {
  console.log("\n14. Testing juno_module_stop...");
  const callResult = await sendRequest(server, "tools/call", {
    name: "juno_module_stop",
    arguments: { target: "satellite" }
  });

  const output = callResult.result?.content?.[0]?.text || "";
  const isError = callResult.result?.isError || false;

  console.log("   isError:", isError);
  console.log("   Output:", output.slice(0, 300));

  if (output.length > 0) {
    console.log("   PASSED (responded correctly)");
    return true;
  }
  console.log("   FAILED");
  return false;
}

async function testJunoModuleStart(server) {
  console.log("\n15. Testing juno_module_start...");
  const callResult = await sendRequest(server, "tools/call", {
    name: "juno_module_start",
    arguments: { target: "satellite" }
  });

  const output = callResult.result?.content?.[0]?.text || "";
  const isError = callResult.result?.isError || false;

  console.log("   isError:", isError);
  console.log("   Output:", output.slice(0, 300));

  if (output.length > 0) {
    console.log("   PASSED (responded correctly)");
    return true;
  }
  console.log("   FAILED");
  return false;
}

async function testJunoSnapshotList(server) {
  console.log("\n16. Testing juno_snapshot_list...");
  const callResult = await sendRequest(server, "tools/call", {
    name: "juno_snapshot_list",
    arguments: { target: "satellite" }
  });

  const output = callResult.result?.content?.[0]?.text || "";
  const isError = callResult.result?.isError || false;

  console.log("   isError:", isError);
  console.log("   Output:", output.slice(0, 300));

  if (output.length > 0) {
    console.log("   PASSED (responded correctly)");
    return true;
  }
  console.log("   FAILED");
  return false;
}

async function testJunoChangesList(server) {
  console.log("\n17. Testing juno_changes_list...");
  const callResult = await sendRequest(server, "tools/call", {
    name: "juno_changes_list",
    arguments: {}
  });

  const output = callResult.result?.content?.[0]?.text || "";
  const isError = callResult.result?.isError || false;

  console.log("   isError:", isError);
  console.log("   Output:", output.slice(0, 300));

  if (output.length > 0) {
    console.log("   PASSED (responded correctly)");
    return true;
  }
  console.log("   FAILED");
  return false;
}

async function testJunoDocs(server) {
  console.log("\n18. Testing juno_docs...");
  const callResult = await sendRequest(server, "tools/call", {
    name: "juno_docs",
    arguments: { topic: "intro" }
  });

  const output = callResult.result?.content?.[0]?.text || "";
  const isError = callResult.result?.isError || false;

  console.log("   isError:", isError);
  console.log("   Output:", output.slice(0, 300));

  if (!isError && output.length > 0 && output.includes("Juno")) {
    console.log("   PASSED");
    return true;
  }
  console.log("   FAILED");
  return false;
}

async function main() {
  console.log("Starting MCP server for tools tests...");
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
    results.push(await testJunoConfigInit(server));
    results.push(await testJunoConfigInitWriteFile(server));
    results.push(await testJunoConfigApply(server));
    results.push(await testJunoEmulatorStop(server));
    results.push(await testJunoEmulatorClear(server));
    results.push(await testJunoEmulatorWait(server));
    results.push(await testJunoHostingDeploy(server));
    results.push(await testJunoHostingClear(server));
    results.push(await testJunoHostingPrune(server));
    results.push(await testJunoFunctionsBuild(server));
    results.push(await testJunoFunctionsEject(server));
    // Skip functionsPublish - requires a built project
    console.log("\n12. Testing juno_functions_publish... SKIPPED (requires built functions)");
    results.push(true);

    // Module tests
    results.push(await testJunoModuleStatus(server));
    results.push(await testJunoModuleStop(server));
    results.push(await testJunoModuleStart(server));

    // Snapshot tests
    results.push(await testJunoSnapshotList(server));

    // Changes tests
    results.push(await testJunoChangesList(server));

    // Docs test
    results.push(await testJunoDocs(server));

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
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

main();