import Link from "next/link";
import { SUBDOMAIN } from "@/lib/brand";
import { Mark } from "@/components/mark";

const LINKS = [
  { href: "/chat", label: "Chat" },
  { href: "/embed-demo", label: "Widget" },
  { href: "/knowledge", label: "Guide" },
  { href: "/docs", label: "Safety" },
  { href: "/admin", label: "Staff desk" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Mark />
          <span className="leading-tight">
            <span className="block font-heading text-lg text-bark">Cedar Grove</span>
            <span className="block text-xs tracking-wide text-muted-foreground">Family Clinic guide</span>
          </span>
        </Link>
        <nav className="ml-auto flex flex-wrap items-center gap-1">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-1.5 text-sm text-foreground/80 hover:bg-secondary hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <span className="ml-1 rounded-full bg-foam px-2.5 py-1 text-xs font-medium text-moss">
            {SUBDOMAIN}
          </span>
        </nav>
      </div>
    </header>
  );
}
