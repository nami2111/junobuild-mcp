import { randomBytes } from "node:crypto";
import {
  createRequestStateCodec,
  type ServerContext,
} from "@modelcontextprotocol/server";

export interface LoginFlowState {
  step: "password";
}

// Signed (HMAC), not encrypted: the client can decode the payload, so it
// carries flow bookkeeping only — never credentials. Key: JUNO_MCP_STATE_SECRET
// (>=32 bytes) or a per-process random; per-process keys invalidate in-flight
// states on restart, which is fine (the client just re-runs the tool).
const secret =
  process.env.JUNO_MCP_STATE_SECRET ?? randomBytes(32).toString("hex");

const codec = createRequestStateCodec<LoginFlowState>({ key: secret });

export async function mintLoginState(state: LoginFlowState): Promise<string> {
  return await codec.mint(state);
}

// Drop-in for ServerOptions.requestState.verify. Throwing on tamper/expiry is
// what the seam wants: the request is refused with -32602.
export function verifyRequestState(
  state: string,
  ctx: ServerContext
): Promise<LoginFlowState | undefined> {
  return codec.verify(state, ctx);
}
