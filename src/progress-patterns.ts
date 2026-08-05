/**
 * Version-aware progress parsing for the juno CLI.
 *
 * The CLI's transient progress output (batch counters, workflow phases)
 * changes between releases. All parsing lives here so a new juno version
 * can drop in a new pattern set without touching the executor.
 *
 * ponytail: only one observed set (juno CLI >= 0.14, `[n/m]` counters with
 * Initializing/Uploading/Committing phases — confirmed live on v0.15.6).
 * Add a second set here when an older/newer CLI format is documented.
 */
export interface ProgressPatterns {
  /** Matches batch counters like `[3/10]`; group 1 = current, group 2 = total. */
  batchPattern: RegExp;
  /** Ordered workflow phases; progress is spread evenly across them. */
  phases: readonly string[];
}

export const MODERN_PATTERNS: ProgressPatterns = {
  batchPattern: /\[(\d+)\/(\d+)\]/,
  phases: ["Initializing", "Uploading", "Committing"],
};

/**
 * Known output-format divergences keyed by CLI version. Currently empty:
 * only one observed format (juno >= 0.14, `[n/m]` batch counters with
 * Initializing/Uploading/Committing phases — confirmed live on v0.15.6).
 * Add an entry here when an older/newer CLI format is documented.
 */
const versionPatterns = new Map<string, ProgressPatterns>();

/**
 * Select the pattern set for a CLI version. Unknown/missing versions get the
 * modern set (best-effort), matching how the CLI has behaved for years.
 */
export function getProgressPatterns(version?: string): ProgressPatterns {
  return versionPatterns.get(version ?? "") ?? MODERN_PATTERNS;
}

/**
 * Parse a single CLI output line against the given pattern set.
 * Returns null when the line is not a progress line.
 */
export function parseProgressLine(
  line: string,
  patterns: ProgressPatterns = MODERN_PATTERNS
): { progress: number; message: string } | null {
  const batchMatch = line.match(patterns.batchPattern);
  if (!batchMatch) {
    return null;
  }

  const current = Number.parseInt(batchMatch[1], 10);
  const total = Number.parseInt(batchMatch[2], 10);
  if (total === 0) {
    return null;
  }

  let phaseOffset = 1;
  for (let i = 0; i < patterns.phases.length; i++) {
    const phase = patterns.phases[i];
    if (phase !== undefined && new RegExp(`\\b${phase}\\b`).test(line)) {
      phaseOffset = i + 1;
      break;
    }
  }

  const totalSteps = total * patterns.phases.length;
  const completedSteps = (current - 1) * patterns.phases.length + phaseOffset;
  const progress = Math.min(
    Math.round((completedSteps / totalSteps) * 100),
    99
  );

  const phase = findPhase(line, patterns.phases) ?? "Processing";
  return { progress, message: `${phase} batch ${current}/${total}` };
}

function findPhase(
  line: string,
  phases: readonly string[]
): string | undefined {
  return phases.find((p) => new RegExp(`\\b${p}\\b`).test(line));
}
