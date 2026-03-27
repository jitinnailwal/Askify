"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  FileText,
  Tag,
  Clock,
  MessageSquare,
  Hash,
} from "lucide-react";
import { getGuestId } from "@/lib/guest";
import toast from "react-hot-toast";

interface Chunk {
  id: string;
  content: string;
  index: number;
}

interface DocumentData {
  id: string;
  title: string;
  fileName: string;
  fileSize: number;
  content: string;
  tags: string[];
  status: string;
  createdAt: string;
  chunks: Chunk[];
  _count: { chatSessions: number };
}

export default function DocumentViewerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const [doc, setDoc] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeChunk, setActiveChunk] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const headers: Record<string, string> = {};
      if (!session?.user) {
        const guestId = getGuestId();
        if (guestId) headers["x-guest-id"] = guestId;
      }

      const res = await fetch(`/api/documents/${id}`, { headers });
      if (res.ok) {
        setDoc(await res.json());
      } else {
        toast.error("Document not found");
        router.push("/dashboard");
      }
      setLoading(false);
    }
    load();
  }, [id, session?.user, router]);

  const startChat = async () => {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (!session?.user) {
        const guestId = getGuestId();
        if (guestId) headers["x-guest-id"] = guestId;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({ documentId: id }),
      });

      if (res.ok) {
        const chatSession = await res.json();
        router.push(`/chat/${chatSession.id}`);
      }
    } catch {
      toast.error("Failed to start chat");
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
          <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!doc) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{doc.title}</h1>
          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <FileText size={12} />
              {doc.fileName}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock size={12} />
              {new Date(doc.createdAt).toLocaleDateString()}
            </span>
            <span className="inline-flex items-center gap-1">
              <Hash size={12} />
              {doc.chunks.length} chunks
            </span>
          </div>
        </div>
        <button
          onClick={startChat}
          disabled={doc.status !== "ready"}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <MessageSquare size={16} />
          Chat
        </button>
      </div>

      {/* Tags */}
      {doc.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {doc.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-full"
            >
              <Tag size={11} />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Chunks */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Document Chunks ({doc.chunks.length})
        </h2>
        {doc.chunks.map((chunk, i) => (
          <motion.div
            key={chunk.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.03 }}
            onClick={() =>
              setActiveChunk(activeChunk === chunk.id ? null : chunk.id)
            }
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              activeChunk === chunk.id
                ? "border-blue-400 bg-blue-50 dark:bg-blue-950/20 shadow-sm"
                : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded">
                Chunk #{chunk.index + 1}
              </span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {activeChunk === chunk.id
                ? chunk.content
                : chunk.content.slice(0, 300) +
                  (chunk.content.length > 300 ? "..." : "")}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
