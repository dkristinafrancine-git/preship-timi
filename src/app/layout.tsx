import type { Metadata } from "next";
import { Funnel_Display, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/components/preship/providers";

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
  title: "Preship — The Alpha War Room for Pre-Launch Founders",
  description:
    "Preship is the alpha war room: a high-velocity tactical command center where pre-launch founders intently collaborate, support, back, and trade leverage in broad daylight. Broadcast bottlenecks, match collaborators in Synergy, and ideate new startups in invite-only IdeaLab audio rooms.",
  keywords: [
    "Preship",
    "alpha war room",
    "founders",
    "pre-launch",
    "startup",
    "collaboration",
    "synergy",
    "idealab",
  ],
  authors: [{ name: "Preship" }],
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "Preship — The Alpha War Room for Pre-Launch Founders",
    description:
      "A high-velocity tactical command center where pre-launch founders collaborate, back, and trade leverage in broad daylight.",
    siteName: "Preship",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Preship — The Alpha War Room for Pre-Launch Founders",
    description:
      "A high-velocity tactical command center where pre-launch founders collaborate, back, and trade leverage in broad daylight.",
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
        <Providers>
          {children}
        </Providers>
        <Toaster />
        <SonnerToaster />
      </body>
    </html>
  );
}
