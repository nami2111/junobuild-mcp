import { z } from "zod";

export const TOPICS = {
  intro: "/docs/intro.md",
  "start-a-new-project": "/docs/start-a-new-project.md",
  "setup-the-sdk": "/docs/setup-the-sdk.md",
  "create-a-satellite": "/docs/create-a-satellite.md",
  authentication: "/docs/build/authentication.md",
  datastore: "/docs/build/datastore.md",
  storage: "/docs/build/storage.md",
  hosting: "/docs/build/hosting.md",
  functions: "/docs/build/functions.md",
  analytics: "/docs/build/analytics.md",
  cli: "/docs/reference/cli.md",
  configuration: "/docs/reference/configuration.md",
  plugins: "/docs/reference/plugins.md",
  settings: "/docs/reference/settings.md",
  emulator: "/docs/reference/emulator.md",
  terminology: "/docs/terminology.md",
  pricing: "/docs/pricing.md"
} as const;

export type TopicKey = keyof typeof TOPICS;

export const junoDocsSchema = z
  .object({
    topic: z
      .enum(Object.keys(TOPICS) as [TopicKey, ...TopicKey[]])
      .describe(
        "Documentation topic to retrieve. Covers Juno concepts, SDK setup, CLI reference, configuration, and more."
      )
  })
  .strict();
