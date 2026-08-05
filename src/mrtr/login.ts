import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import {
  acceptedContent,
  type CallToolResult,
  type InputRequiredResult,
  inputRequired,
  type ServerContext,
} from "@modelcontextprotocol/server";
import { z } from "zod";
import {
  buildFlagArgs,
  formatResponse,
  makeTraceLogger,
  resolveCliParts,
} from "../cli.js";
import { NETWORK_TIMEOUT } from "../constants.js";
import { runProcess, stripAnsi, stripProgressChars } from "../executor.js";
import type { TraceContext } from "../trace.js";
import { traceEnv } from "../trace.js";
import type { GlobalFlags } from "../types.js";
import { mintLoginState } from "./state.js";

// MRTR pilot: juno login's credentials-encryption passphrase prompt.
//
// Round A spawns `juno login` and watches for the passphrase prompt. When it
// appears, the child is killed and an input_required result asks the client
// for the passphrase (requestState carries the step, HMAC-protected). Round B
// (the client's retry) feeds the passphrase back over stdin and returns the
// final output. Non-interactive environments (JUNO_TOKEN, --headless) never
// prompt, so rounds complete in one trip.
//
// ponytail: the prompt contract is "juno asks once for a passphrase". If a
// future juno gates it behind a y/N or confirmation prompt, round B feeds the
// passphrase to the first match and fails loudly — run juno login in a
// terminal in that case.
export const PASSWORD_INPUT_KEY = "login.encryptionPassphrase";
const PASSWORD_PROMPT_PATTERN = /password|passphrase|encrypt/i;
const PROMPT_WAIT_TIMEOUT_MS = 90_000;
const PASS_PROMPT_TIMEOUT_MS = 30_000;

export const loginPassphraseSchema = z.object({
  passphrase: z.string().min(4, "Passphrase must be at least 4 characters"),
});

type RunOutcome =
  | { kind: "completed"; exitCode: number; output: string }
  | { kind: "prompted"; output: string };

interface PromptWatcher {
  abort: () => void;
  promise: Promise<RunOutcome>;
}

function runLoginWatchingForPrompt(
  cmd: string,
  args: string[],
  trace?: TraceContext
): PromptWatcher {
  const child = spawn(cmd, args, {
    env: {
      ...process.env,
      FORCE_COLOR: "0",
      ...traceEnv(trace),
    },
  });

  let output = "";
  let prompted = false;
  let processExited = false;

  const promptTimeout = setTimeout(() => {
    if (!(processExited || prompted)) {
      child.kill("SIGTERM");
    }
  }, PROMPT_WAIT_TIMEOUT_MS);

  const promise = new Promise<RunOutcome>((resolve) => {
    const finish = (outcome: RunOutcome): void => {
      if (processExited || prompted) {
        return;
      }
      prompted = outcome.kind === "prompted";
      clearTimeout(promptTimeout);
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 2000);
      resolve(outcome);
    };

    if (child.stdout) {
      const rl = createInterface({ input: child.stdout, terminal: false });
      rl.on("line", (line) => {
        const text = stripAnsi(stripProgressChars(line));
        if (!text) {
          return;
        }
        output += `${text}\n`;
        if (!prompted && PASSWORD_PROMPT_PATTERN.test(text)) {
          finish({ kind: "prompted", output });
        }
      });
    }

    child.on("close", (code) => {
      processExited = true;
      clearTimeout(promptTimeout);
      resolve({ kind: "completed", exitCode: code ?? 1, output });
    });

    child.on("error", (error) => {
      processExited = true;
      clearTimeout(promptTimeout);
      resolve({
        kind: "completed",
        exitCode: 1,
        output: `${output}\n${error.message}`,
      });
    });
  });

  return { abort: () => child.kill("SIGKILL"), promise };
}

export async function handleLogin(
  params: Record<string, unknown>,
  ctx: ServerContext
): Promise<CallToolResult | InputRequiredResult> {
  const flags: GlobalFlags = {
    mode: params.mode as string | undefined,
    profile: params.profile as string | undefined,
  };
  const { cmd: cliCmd, args: cliArgs } = await resolveCliParts();
  const loginArgs = [...cliArgs, "login", ...buildFlagArgs(flags)];
  const trace = makeTraceLogger(ctx);

  // Retry round: the client carried our requestState (verified by the
  // ServerOptions.requestState hook) and, hopefully, the passphrase.
  const state = ctx.mcpReq.requestState<{ step: "password" }>();
  if (state) {
    const passphrase = acceptedContent(
      ctx.mcpReq.inputResponses,
      PASSWORD_INPUT_KEY,
      loginPassphraseSchema
    );
    if (!passphrase) {
      return {
        content: [
          {
            type: "text",
            text: "Login was interrupted: the passphrase answer was missing. Run juno login in a terminal instead.",
          },
        ],
        isError: true,
      };
    }

    const result = await runProcess(cliCmd, loginArgs, NETWORK_TIMEOUT, {
      stdinConfig: {
        answers: [passphrase.passphrase],
        prompts: [PASSWORD_PROMPT_PATTERN],
        initialDelay: 0,
        answerDelay: 0,
        promptTimeout: PASS_PROMPT_TIMEOUT_MS,
      },
      trace,
    });
    const { text, isError } = formatResponse(result, "Login");
    return { content: [{ type: "text" as const, text }], isError };
  }

  // First round: run and watch for the passphrase prompt.
  const watcher = runLoginWatchingForPrompt(cliCmd, loginArgs, trace);
  const outcome = await watcher.promise;

  if (outcome.kind === "completed") {
    const { text, isError } = formatResponse(
      {
        stdout: outcome.output,
        stderr: "",
        exitCode: outcome.exitCode,
      },
      "Login"
    );
    return { content: [{ type: "text" as const, text }], isError };
  }

  return inputRequired({
    inputRequests: {
      [PASSWORD_INPUT_KEY]: inputRequired.elicit({
        message:
          "The Juno CLI wants a passphrase to encrypt your locally-saved credentials.",
        requestedSchema: loginPassphraseSchema,
      }),
    },
    requestState: await mintLoginState({ step: "password" }),
  });
}
