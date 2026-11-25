import fs from "fs";
import path from "path";

export type Article = {
  slug: string;
  title: string;
  kicker: string;
  paragraphs: string[];
};

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };
  const meta: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const split = line.indexOf(":");
    if (split === -1) continue;
    meta[line.slice(0, split).trim()] = line.slice(split + 1).trim();
  }
  return { meta, body: match[2] };
}

const KB_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "kb");

export function loadArticles(): Article[] {
  if (!fs.existsSync(/*turbopackIgnore: true*/ KB_DIR)) return [];
  return fs
    .readdirSync(/*turbopackIgnore: true*/ KB_DIR)
    .filter((file) => file.endsWith(".md"))
    .sort()
    .map((file) => {
      const raw = fs.readFileSync(/*turbopackIgnore: true*/ path.join(KB_DIR, file), "utf8");
      const { meta, body } = parseFrontmatter(raw);
      const paragraphs = body
        .split(/\n\s*\n/)
        .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
        .filter(Boolean);
      const slug = meta.slug || file.replace(/^\d+-/, "").replace(/\.md$/, "");
      return {
        slug,
        title: meta.title || slug,
        kicker: meta.kicker || "Patient guide",
        paragraphs,
      };
    });
}

export const ARTICLES: Article[] = loadArticles();

export function articleBySlug(slug: string): Article | undefined {
  return ARTICLES.find((article) => article.slug === slug);
}
