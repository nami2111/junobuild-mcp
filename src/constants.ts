export const CHARACTER_LIMIT = 25000;

export const DEFAULT_TIMEOUT = 60_000;
export const DEPLOY_TIMEOUT = 300_000;
export const EMULATOR_START_TIMEOUT = 120_000;

export const CLI_PACKAGE = "@junobuild/cli";

export const enum ModuleTarget {
  SATELLITE = "satellite",
  MISSION_CONTROL = "mission-control",
  ORBITER = "orbiter"
}

export const enum Mode {
  PRODUCTION = "production",
  STAGING = "staging",
  DEVELOPMENT = "development"
}

export const enum FunctionLanguage {
  RUST = "rust",
  TYPESCRIPT = "typescript",
  JAVASCRIPT = "javascript",
  RS = "rs",
  TS = "ts",
  MJS = "mjs"
}
