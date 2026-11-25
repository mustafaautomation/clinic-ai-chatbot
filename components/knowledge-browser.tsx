"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import type { Article } from "@/lib/kb";

export function KnowledgeBrowser({ articles }: { articles: Article[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return articles;
    return articles.filter((article) =>
      `${article.title} ${article.kicker} ${article.paragraphs.join(" ")}`.toLowerCase().includes(needle),
    );
  }, [articles, query]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-xs font-medium tracking-[0.18em] text-moss uppercase">Patient guide</p>
      <h1 className="mt-2 font-heading text-4xl text-bark sm:text-5xl">What the chat is allowed to know</h1>
      <p className="mt-3 text-muted-foreground">
        Every grounded answer comes from these pages. If a fact is not here, the guide is supposed to say so
        instead of filling the gap.
      </p>
      <label htmlFor="guide-search" className="mt-6 block text-sm font-medium">
        Search the guide
      </label>
      <Input
        id="guide-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Insurance, refills, Saturday hours…"
        className="mt-2 h-10 bg-card"
      />
      {filtered.length === 0 ? (
        <p className="mt-8 rounded-2xl bg-card p-4 text-sm">Nothing in the guide matches that search.</p>
      ) : (
        <div className="mt-8 space-y-6">
          {filtered.map((article) => (
            <article key={article.slug} id={article.slug} className="scroll-mt-24 rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
              <p className="text-xs tracking-wide text-clay uppercase">{article.kicker}</p>
              <h2 className="mt-1 font-heading text-3xl text-bark">{article.title}</h2>
              <div className="mt-4 space-y-3 text-sm leading-6">
                {article.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
