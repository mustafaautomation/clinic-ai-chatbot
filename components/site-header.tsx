"use client";

import Link from "next/link";
import { Mark } from "@/components/mark";
import { ThemeToggle } from "@/components/theme-toggle";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/chat", label: "Live chat" },
  { href: "/admin", label: "Admin" },
  { href: "/embed-demo", label: "Embed" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 h-16 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-full bg-accent text-accent-foreground">
            <Mark className="size-4" />
          </span>
          <span className="font-display text-[17px] leading-none tracking-[-0.02em]">Cedar Grove</span>
        </Link>
        <nav className="ml-auto flex items-center gap-1">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hidden rounded-full px-3 py-1.5 text-sm text-foreground/80 hover:bg-muted sm:inline">
              {link.label}
            </Link>
          ))}
          <button
            type="button"
            className="mr-1 rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground"
            onClick={() => {
              document.getElementById("desk-chat")?.scrollIntoView({ behavior: "smooth", block: "center" });
              window.dispatchEvent(new Event("cg-open-chat"));
            }}
          >
            Open the desk
          </button>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
