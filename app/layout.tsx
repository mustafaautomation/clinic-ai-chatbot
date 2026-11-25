import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteLauncher } from "@/components/site-launcher";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  weight: "500",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Cedar Grove Family Clinic",
    template: "%s · Cedar Grove",
  },
  description:
    "Portfolio demo of a clinic chat guide for insurance, scheduling, and policies. It does not diagnose. Synthetic data only.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          {children}
          <SiteLauncher />
        </ThemeProvider>
      </body>
    </html>
  );
}
