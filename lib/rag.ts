import { ARTICLES, type Article } from "@/lib/kb";
import type { Citation } from "@/lib/types";

export type Chunk = {
  id: string;
  slug: string;
  title: string;
  text: string;
};

const STOP = new Set([
  "a", "an", "the", "and", "or", "to", "of", "for", "in", "on", "at", "with",
  "my", "me", "i", "we", "our", "you", "your", "is", "are", "do", "does", "can",
  "what", "whats", "how", "when", "where", "who", "please", "about", "this",
  "that", "it", "be", "if", "from", "have", "has", "get", "need", "want", "like",
  "just", "offer", "offers", "tell", "make", "before", "into", "should", "which",
]);

const DIM = 192;

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP.has(token));
}

function hashToken(token: string): number {
  let hash = 2166136261;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function embedTokens(tokens: string[]): Float64Array {
  const vector = new Float64Array(DIM);
  for (const token of tokens) {
    const hash = hashToken(token);
    vector[hash % DIM] += hash & 1024 ? 1 : -1;
    const hash2 = hashToken(`${token}#`);
    vector[hash2 % DIM] += hash2 & 1024 ? 0.5 : -0.5;
  }
  let norm = 0;
  for (const value of vector) norm += value * value;
  norm = Math.sqrt(norm) || 1;
  for (let index = 0; index < vector.length; index += 1) vector[index] /= norm;
  return vector;
}

export function cosine(left: Float64Array, right: Float64Array): number {
  let score = 0;
  for (let index = 0; index < left.length; index += 1) score += left[index] * right[index];
  return score;
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

type IndexedChunk = Chunk & { tokens: string[]; tf: Map<string, number>; embedding: Float64Array };

function indexChunks(chunks: Chunk[]): IndexedChunk[] {
  return chunks.map((chunk) => {
    const tokens = tokenize(`${chunk.title} ${chunk.text}`);
    const tf = new Map<string, number>();
    for (const token of tokens) tf.set(token, (tf.get(token) ?? 0) + 1);
    return { ...chunk, tokens, tf, embedding: embedTokens(tokens) };
  });
}

const INDEX = indexChunks(chunksFrom());
const AVG_LEN = INDEX.reduce((sum, chunk) => sum + chunk.tokens.length, 0) / Math.max(INDEX.length, 1);
const DF = new Map<string, number>();
for (const chunk of INDEX) {
  for (const token of new Set(chunk.tokens)) DF.set(token, (DF.get(token) ?? 0) + 1);
}

function bm25(query: string[], chunk: IndexedChunk): number {
  const k1 = 1.2;
  const b = 0.75;
  let score = 0;
  for (const token of query) {
    const tf = chunk.tf.get(token) ?? 0;
    if (!tf) continue;
    const df = DF.get(token) ?? 0;
    const idf = Math.log(1 + (INDEX.length - df + 0.5) / (df + 0.5));
    const denom = tf + k1 * (1 - b + b * (chunk.tokens.length / (AVG_LEN || 1)));
    score += idf * ((tf * (k1 + 1)) / denom);
  }
  return score;
}

export type RetrievalHit = {
  chunk: Chunk;
  score: number;
  hybrid: number;
  overlap: number;
  bm25: number;
  cosine: number;
};

export function retrieve(query: string, limit = 4): RetrievalHit[] {
  const queryTokens = tokenize(query);
  if (!queryTokens.length || !INDEX.length) return [];
  const queryEmbedding = embedTokens(queryTokens);
  const queryBigrams = new Set<string>();
  for (let index = 0; index < queryTokens.length - 1; index += 1) {
    queryBigrams.add(`${queryTokens[index]}_${queryTokens[index + 1]}`);
  }
  const raw = INDEX.map((chunk) => {
    const lexical = bm25(queryTokens, chunk);
    const semantic = cosine(queryEmbedding, chunk.embedding);
    let overlap = 0;
    const seen = new Set(chunk.tokens);
    for (const token of queryTokens) if (seen.has(token)) overlap += 1;
    const body = tokenize(chunk.text);
    let bigrams = 0;
    for (let index = 0; index < body.length - 1; index += 1) {
      if (queryBigrams.has(`${body[index]}_${body[index + 1]}`)) bigrams += 1;
    }
    const titleSet = new Set(tokenize(chunk.title));
    let titleOverlap = 0;
    for (const token of queryTokens) if (titleSet.has(token)) titleOverlap += 1;
    return { chunk, lexical, semantic, overlap: overlap + bigrams * 2 + titleOverlap, bigrams };
  });
  const maxLexical = Math.max(...raw.map((hit) => hit.lexical), 0);
  const ranked = raw
    .map((hit) => {
      const lexicalNorm = maxLexical > 0 ? hit.lexical / maxLexical : 0;
      const semanticNorm = (hit.semantic + 1) / 2;
      const hybrid = 0.65 * lexicalNorm + 0.35 * semanticNorm;
      return {
        chunk: { id: hit.chunk.id, slug: hit.chunk.slug, title: hit.chunk.title, text: hit.chunk.text },
        score: hybrid + hit.overlap,
        hybrid,
        overlap: hit.overlap,
        bm25: hit.lexical,
        cosine: hit.semantic,
      };
    })
    .filter((hit) => hit.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || b.bm25 - a.bm25 || b.hybrid - a.hybrid);
  return ranked.slice(0, limit);
}

export function isConfidentHit(hit: RetrievalHit | undefined): boolean {
  if (!hit) return false;
  return hit.overlap >= 1 && (hit.hybrid >= 0.34 || hit.overlap >= 2);
}

export function answerFromGuide(query: string): { text: string; citations: Citation[]; confidence: number } | null {
  const hits = retrieve(query, 8).filter((hit) => isConfidentHit(hit));
  if (!hits.length) return null;
  const bestSlug = hits[0].chunk.slug;
  const picked = hits.filter((hit) => hit.chunk.slug === bestSlug).slice(0, 2);
  const citations: Citation[] = [];
  const paragraphs: string[] = [];
  for (const hit of picked) {
    paragraphs.push(hit.chunk.text);
    if (!citations.some((item) => item.slug === hit.chunk.slug)) {
      citations.push({
        id: hit.chunk.id,
        slug: hit.chunk.slug,
        title: hit.chunk.title,
        excerpt: hit.chunk.text,
      });
    }
  }
  if (!paragraphs.length) return null;
  return { text: paragraphs.join("\n\n"), citations, confidence: hits[0].hybrid };
}

export function abstainCopy(): string {
  return "I couldn't find that in the Cedar Grove patient guide, so I won't guess. I can help with hours, locations, insurance, clinicians, new patients, visit prep, telehealth, billing, refills, vaccines, lab results, or privacy. I can also ask the front desk to call you.";
}
