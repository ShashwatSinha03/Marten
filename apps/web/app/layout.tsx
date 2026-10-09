import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Marten — Look closer.",
  description: "An evidence-backed investigation workspace for your product.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
