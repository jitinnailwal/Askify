import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  preload: false,
});

export const metadata: Metadata = {
  title: "Askify - AI-Powered Knowledge Base",
  description:
    "Upload documents and ask questions using AI-powered semantic search. Your personal knowledge assistant.",
  keywords: ["AI", "RAG", "knowledge base", "document QA", "semantic search"],
  icons: {
    icon: "/Askify_logo.png",
    apple: "/Askify_logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body
        className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors"
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
