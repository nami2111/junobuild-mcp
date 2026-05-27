export const JunoContextCapabilities = {
  mode: "mode",
  profile: "profile",
  containerUrl: "containerUrl",
  consoleUrl: "consoleUrl"
} as const;

export type JunoContextCapability =
  (typeof JunoContextCapabilities)[keyof typeof JunoContextCapabilities];

export interface JunoContext {
  mode?: string;
  profile?: string;
  containerUrl?: string;
  consoleUrl?: string;
}

export const modeProfileContext = ["mode", "profile"] as const;
export const containerContext = ["mode", "profile", "containerUrl"] as const;
export const environmentContext = ["mode", "profile", "containerUrl", "consoleUrl"] as const;

export function pickJunoContext(
  params: Record<string, unknown>,
  capabilities: readonly JunoContextCapability[]
): JunoContext {
  const context: JunoContext = {};

  const mode = stringParam(params.mode);
  const profile = stringParam(params.profile);
  const containerUrl = stringParam(params.containerUrl);
  const consoleUrl = stringParam(params.consoleUrl);

  if (capabilities.includes("mode") && mode) context.mode = mode;
  if (capabilities.includes("profile") && profile) context.profile = profile;
  if (capabilities.includes("containerUrl") && containerUrl) context.containerUrl = containerUrl;
  if (capabilities.includes("consoleUrl") && consoleUrl) context.consoleUrl = consoleUrl;

  return context;
}

export function buildJunoContextArgs(
  context?: JunoContext,
  capabilities: readonly JunoContextCapability[] = environmentContext
): string[] {
  const args: string[] = [];
  if (capabilities.includes("mode") && context?.mode) args.push("--mode", context.mode);
  if (capabilities.includes("profile") && context?.profile) {
    args.push("--profile", context.profile);
  }
  if (capabilities.includes("containerUrl") && context?.containerUrl) {
    args.push("--container-url", context.containerUrl);
  }
  if (capabilities.includes("consoleUrl") && context?.consoleUrl) {
    args.push("--console-url", context.consoleUrl);
  }
  return args;
}

function stringParam(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
