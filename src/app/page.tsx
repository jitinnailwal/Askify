"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  FileText,
  MessageSquare,
  Zap,
  Shield,
  ArrowRight,
  Sun,
  Moon,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { useTheme } from "@/components/theme-provider";

const features = [
  {
    icon: FileText,
    title: "Upload Documents",
    description: "Upload PDFs, text files, and notes. We extract and process your content automatically.",
  },
  {
    icon: MessageSquare,
    title: "Ask Questions",
    description: "Chat with your documents using AI. Get accurate answers with source references.",
  },
  {
    icon: Zap,
    title: "Instant Answers",
    description: "Powered by semantic search and Google Gemini for fast, relevant responses.",
  },
  {
    icon: Shield,
    title: "Your Data, Your Control",
    description: "Documents are securely stored and only accessible by you.",
  },
];

export default function LandingPage() {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo size={36} />
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              Askify
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {session?.user ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex justify-center mb-8">
              <Logo size={80} />
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Your AI-Powered{" "}
              <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                Knowledge Base
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-10">
              Upload documents and ask questions. Askify uses semantic search and
              AI to find answers from your own data — instantly.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30"
            >
              Try Now — It&apos;s Free
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-3 text-base font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
              Create Account
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 text-sm text-gray-500"
          >
            No account needed — try with 1 document for free
          </motion.p>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
            How it works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center mb-4 group-hover:bg-blue-100 dark:group-hover:bg-blue-950/50 transition-colors">
                  <feature.icon size={22} className="text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Ready to ask your documents?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Start for free. No credit card required.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl"
          >
            Get Started
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Logo size={24} />
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
              Askify
            </span>
          </div>
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Askify. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
