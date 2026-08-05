import type { ServerContext } from "@modelcontextprotocol/server";

// OTel trace context (SEP-414) forwarded from the MCP request into the juno
// CLI child environment. Keys follow the W3C trace-context header formats;
// the SDK carries them in `_meta` as plain keys (not io.* envelope keys).

export interface TraceContext {
  baggage?: string;
  traceparent?: string;
  tracestate?: string;
}

export function extractTraceContext(
  ctx: ServerContext
): TraceContext | undefined {
  const meta = ctx.mcpReq._meta as
    | { traceparent?: unknown; tracestate?: unknown; baggage?: unknown }
    | undefined;

  const trace: TraceContext = {};
  const { traceparent, tracestate, baggage } = meta ?? {};
  if (typeof traceparent === "string") {
    trace.traceparent = traceparent;
  }
  if (typeof tracestate === "string") {
    trace.tracestate = tracestate;
  }
  if (typeof baggage === "string") {
    trace.baggage = baggage;
  }
  return trace.traceparent || trace.tracestate || trace.baggage
    ? trace
    : undefined;
}

export function traceEnv(trace: TraceContext | undefined): NodeJS.ProcessEnv {
  if (!trace) {
    return {};
  }
  const env: NodeJS.ProcessEnv = {};
  if (trace.traceparent) {
    env.traceparent = trace.traceparent;
  }
  if (trace.tracestate) {
    env.tracestate = trace.tracestate;
  }
  if (trace.baggage) {
    env.baggage = trace.baggage;
  }
  return env;
}
