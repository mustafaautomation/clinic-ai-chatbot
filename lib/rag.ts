import { ARTICLES, type Article } from "@/lib/kb";
import type { Citation } from "@/lib/types";

export type Chunk = {
  id: string;
  slug: string;
  title: string;
  text: string;
};

const STOP = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "to",
  "of",
  "for",
  "in",
  "on",
  "at",
  "with",
  "my",
  "me",
  "i",
  "we",
  "our",
  "you",
  "your",
  "is",
  "are",
  "do",
  "does",
  "can",
  "what",
  "whats",
  "how",
  "when",
  "where",
  "who",
  "please",
  "about",
  "this",
  "that",
  "it",
  "be",
  "if",
  "from",
  "have",
  "has",
  "get",
  "need",
  "want",
  "like",
  "just",
  "offer",
  "offers",
  "tell",
  "make",
  "before",
  "into",
  "your",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP.has(token));
}

export function chunksFrom(articles: Article[] = ARTICLES): Chunk[] {
  const chunks: Chunk[] = [];
  for (const article of articles) {
    article.paragraphs.forEach((paragraph, index) => {
      chunks.push({
        id: `${article.slug}#${index}`,
        slug: article.slug,
        title: article.title,
        text: paragraph,
      });
    });
  }
  return chunks;
}

const CHUNKS = chunksFrom();

export function retrieve(query: string, limit = 3): { chunk: Chunk; score: number }[] {
  const queryTokens = tokenize(query);
  if (!queryTokens.length) return [];
  const scored = CHUNKS.map((chunk) => {
    const tokens = new Set(tokenize(`${chunk.title} ${chunk.text}`));
    let overlap = 0;
    for (const token of queryTokens) {
      if (tokens.has(token)) overlap += 1;
    }
    const titleTokens = new Set(tokenize(chunk.title));
    let titleHits = 0;
    for (const token of queryTokens) {
      if (titleTokens.has(token)) titleHits += 1;
    }
    const score = overlap * 2 + titleHits * 1.5 + overlap / queryTokens.length;
    return { chunk, score };
  })
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

export function answerFromGuide(query: string): { text: string; citations: Citation[] } | null {
  const hits = retrieve(query, 2);
  if (!hits.length || hits[0].score < 3.5) return null;
  const citations: Citation[] = [];
  const paragraphs: string[] = [];
  for (const hit of hits) {
    if (citations.some((item) => item.slug === hit.chunk.slug) && paragraphs.length >= 2) continue;
    paragraphs.push(hit.chunk.text);
    if (!citations.some((item) => item.slug === hit.chunk.slug)) {
      citations.push({
        id: hit.chunk.id,
        slug: hit.chunk.slug,
        title: hit.chunk.title,
        excerpt: hit.chunk.text,
      });
    }
    if (paragraphs.length >= 2) break;
  }
  if (!paragraphs.length) return null;
  return { text: paragraphs.join("\n\n"), citations };
}

export function abstainCopy(): string {
  return "I couldn't find that in the Cedar Grove patient guide, so I won't guess. I can help with hours, locations, insurance, clinicians, new patients, visit prep, telehealth, billing, refills, vaccines, lab results, or privacy. I can also ask the front desk to call you.";
}
