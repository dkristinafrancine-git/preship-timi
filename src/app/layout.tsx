import type { Metadata } from "next";
import { Funnel_Display, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const funnel = Funnel_Display({
  variable: "--font-funnel",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Preship — War Room for Alpha Stage Founders",
  description:
    "Preship is a structured, high-intent social network for alpha-stage founders. Broadcast bottlenecks, match collaborators in Synergy, and ideate new startups in invite-only IdeaLab audio rooms.",
  keywords: [
    "Preship",
    "founders",
    "alpha stage",
    "startup",
    "war room",
    "synergy",
    "ideala b",
    "collaboration",
  ],
  authors: [{ name: "Preship" }],
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "Preship — War Room for Alpha Stage Founders",
    description:
      "Broadcast bottlenecks, match collaborators, and ideate new startups in invite-only audio rooms.",
    siteName: "Preship",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Preship — War Room for Alpha Stage Founders",
    description:
      "Broadcast bottlenecks, match collaborators, and ideate new startups in invite-only audio rooms.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${funnel.variable} ${jetbrains.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <SonnerToaster />
      </body>
    </html>
  );
}
