export interface ChangeSubmissionParams {
  keepStaged?: boolean;
  noApply?: boolean;
}

export interface InstantChangeParams extends ChangeSubmissionParams {
  immediate?: boolean;
}

export interface ChangeTargetParams {
  hash?: string;
  id: string;
  keepStaged?: boolean;
}

export interface ChangeApplyParams extends ChangeTargetParams {
  snapshot?: boolean;
}

export function buildChangeSubmissionArgs(
  params: ChangeSubmissionParams
): string[] {
  const args: string[] = [];
  if (params.noApply) {
    args.push("--no-apply");
  }
  if (params.keepStaged && !params.noApply) {
    args.push("-k");
  }
  return args;
}

export function buildInstantChangeArgs(params: InstantChangeParams): string[] {
  const args: string[] = [];
  if (params.immediate) {
    args.push("-i");
  }
  args.push(...buildChangeSubmissionArgs(params));
  return args;
}

export function buildChangeApplyArgs(params: ChangeApplyParams): string[] {
  const args = ["-i", params.id];
  if (params.snapshot) {
    args.push("--snapshot");
  }
  args.push(...buildChangeVerificationArgs(params));
  return args;
}

export function buildChangeRejectArgs(params: ChangeTargetParams): string[] {
  const args = ["-i", params.id];
  args.push(...buildChangeVerificationArgs(params));
  return args;
}

function buildChangeVerificationArgs(params: ChangeTargetParams): string[] {
  const args: string[] = [];
  if (params.hash) {
    args.push("--hash", params.hash);
  }
  if (params.keepStaged) {
    args.push("-k");
  }
  return args;
}
