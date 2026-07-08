import {ClerkProvider} from "@clerk/nextjs";
import type { Metadata } from "next";
import { Titillium_Web, Mitr, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { InvestigationProvider } from "@/components/live-viewer";

const titilliumWeb = Titillium_Web({
  variable: "--font-sans",
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

const mitr = Mitr({
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
  subsets: ["thai", "vietnamese", "latin-ext"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Marten — Investigation Platform for AI-generated UIs",
  description:
    "Investigate AI-generated user interfaces with live evidence collection, product graph analysis, and comprehensive reports.",
  keywords: [
    "AI",
    "UI",
    "investigation",
    "testing",
    "quality assurance",
    "product graph",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${titilliumWeb.variable} ${mitr.variable} ${jetbrainsMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-canvas text-text-primary font-sans">
        <ClerkProvider>
          <ThemeProvider>
          <InvestigationProvider>{children}</InvestigationProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}