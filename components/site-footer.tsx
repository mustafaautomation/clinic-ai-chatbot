import Link from "next/link";
import { RETENTION_DAYS } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-xl">
          Cedar Grove Family Clinic is fictional. Records in this demo are synthetic. Transcripts are
          redacted and designed to be deleted after {RETENTION_DAYS} days. A real clinic would need a
          business associate agreement before any patient information touched this system.{" "}
          <Link href="/docs" className="underline underline-offset-4 hover:text-foreground">
            Read the safety notes
          </Link>
          .
        </p>
        <p>Portfolio demo by Quvantic - fictional brand, not a real business / not client work</p>
      </div>
    </footer>
  );
}
