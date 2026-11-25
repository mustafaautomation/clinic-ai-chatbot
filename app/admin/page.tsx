import type { Metadata } from "next";
import { AdminDesk } from "@/components/admin-desk";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Staff desk",
  description: "Redacted transcripts, the synthetic schedule, refill tickets, and the audit log.",
};

export default function AdminPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <AdminDesk />
      </main>
      <SiteFooter />
    </>
  );
}
