import type { ServerContext } from "@modelcontextprotocol/server";
import { describe, expect, it } from "vitest";
import { runProcess } from "../src/executor.js";
import {
  extractTraceContext,
  type TraceContext,
  traceEnv,
} from "../src/trace.js";

function mockCtx(meta: unknown): ServerContext {
  return {
    mcpReq: { _meta: meta },
  } as unknown as ServerContext;
}

describe("extractTraceContext", () => {
  it("returns undefined when the request carries no trace keys", () => {
    expect(extractTraceContext(mockCtx({}))).toBeUndefined();
    expect(extractTraceContext(mockCtx(undefined))).toBeUndefined();
  });

  it("reads traceparent/tracestate/baggage from _meta", () => {
    const trace = extractTraceContext(
      mockCtx({
        traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
        tracestate: "rojo=00f067aa0ba902b7,congo=t61rcWkgMzE",
        baggage: "userId=alice",
        progressToken: 42,
      })
    );
    expect(trace).toEqual({
      traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
      tracestate: "rojo=00f067aa0ba902b7,congo=t61rcWkgMzE",
      baggage: "userId=alice",
    });
  });

  it("ignores non-string trace keys", () => {
    const trace = extractTraceContext(
      mockCtx({ traceparent: 42, baggage: { userId: "alice" } })
    );
    expect(trace).toBeUndefined();
  });
});

describe("traceEnv", () => {
  it("maps trace context to child env vars", () => {
    const trace: TraceContext = {
      traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
      baggage: "userId=alice",
    };
    expect(traceEnv(trace)).toEqual({
      traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
      baggage: "userId=alice",
    });
    expect(traceEnv(undefined)).toEqual({});
  });
});

describe("runProcess trace forwarding", () => {
  it("propagates the trace into the child process env", async () => {
    const script =
      'echo "tp=$traceparent"; echo "ts=$tracestate"; echo "bg=$baggage"';
    const result = await runProcess("bash", ["-c", script], 10_000, {
      trace: {
        traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
        tracestate: "rojo=x",
        baggage: "userId=alice",
      },
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(
      "tp=00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"
    );
    expect(result.stdout).toContain("ts=rojo=x");
    expect(result.stdout).toContain("bg=userId=alice");
  }, 15_000);
});
