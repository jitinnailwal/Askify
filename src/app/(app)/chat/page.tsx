"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { MessageSquare, FileText, ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/skeleton";
import { guestHeaders } from "@/lib/client-api";

interface SessionItem {
  id: string;
  title: string;
  updatedAt: string;
  document: { id: string; title: string };
}

export default function ChatListPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/chat", { headers: guestHeaders() });
        const data = await res.json();
        setSessions(data.sessions || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Chats</h1>
      <p className="text-sm text-gray-500 mb-6">Your document conversations.</p>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState type="chat" onAction={() => router.push("/dashboard")} />
      ) : (
        <div className="grid gap-3">
          {sessions.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                href={`/chat/${s.id}`}
                className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center shrink-0">
                  <MessageSquare size={18} className="text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{s.title}</p>
                  <p className="flex items-center gap-1 text-xs text-gray-500 mt-0.5 truncate">
                    <FileText size={12} /> {s.document.title}
                  </p>
                </div>
                <ChevronRight size={18} className="text-gray-400 shrink-0" />
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
