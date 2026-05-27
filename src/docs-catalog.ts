import { CHARACTER_LIMIT } from "./constants.js";
import { TOPICS, type TopicKey } from "./schemas/docs.js";

const BASE_URL = "https://raw.githubusercontent.com/junobuild/docs/main/docs";
const MDX_EXT = /\.mdx$/;
const MD_EXT = /\.md$/;
const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_CACHE_SIZE = 50;

interface CacheEntry {
  content: string;
  expiresAt: number;
}

export interface JunoDoc {
  cached: boolean;
  content: string;
  sourceUrl: string;
  topicKey: TopicKey;
}

const docCache = new Map<TopicKey, CacheEntry>();

export function resetJunoDocsCatalogCache(): void {
  docCache.clear();
}

export function getAlternatePath(path: string): string {
  return path.endsWith(".mdx")
    ? path.replace(MDX_EXT, ".md")
    : path.replace(MD_EXT, ".mdx");
}

export async function fetchJunoDoc(topicKey: TopicKey): Promise<JunoDoc> {
  cleanupExpired();

  const cached = docCache.get(topicKey);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      topicKey,
      content: cached.content,
      sourceUrl: `${BASE_URL}${TOPICS[topicKey]}`,
      cached: true,
    };
  }

  const { content, url } = await fetchDoc(TOPICS[topicKey]);
  const truncated =
    content.length > CHARACTER_LIMIT
      ? `${content.slice(0, CHARACTER_LIMIT)}\n...(truncated)`
      : content;

  docCache.set(topicKey, {
    content: truncated,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return { topicKey, content: truncated, sourceUrl: url, cached: false };
}

async function fetchDoc(
  path: string
): Promise<{ content: string; url: string }> {
  const url = `${BASE_URL}${path}`;
  let response = await fetch(url);

  if (!response.ok && response.status === 404) {
    const alternatePath = getAlternatePath(path);
    const alternateUrl = `${BASE_URL}${alternatePath}`;
    response = await fetch(alternateUrl);
    if (response.ok) {
      return { content: await response.text(), url: alternateUrl };
    }
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return { content: await response.text(), url };
}

function cleanupExpired(): void {
  const now = Date.now();
  for (const [key, entry] of docCache) {
    if (entry.expiresAt < now) {
      docCache.delete(key);
    }
  }
  while (docCache.size > MAX_CACHE_SIZE) {
    const oldest = docCache.keys().next().value;
    if (oldest) {
      docCache.delete(oldest);
    }
  }
}
