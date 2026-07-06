import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
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
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-canvas text-text-primary font-sans">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
