"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MessageSquare, FileText, Clock } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { getGuestId } from "@/lib/guest";

interface ChatSessionItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  document: { title: string };
  _count: { messages: number };
}

export default function ChatListPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const headers: Record<string, string> = {};
      if (!session?.user) {
        const guestId = getGuestId();
        if (guestId) headers["x-guest-id"] = guestId;
      }

      const res = await fetch("/api/chat", { headers });
      if (res.ok) setSessions(await res.json());
      setLoading(false);
    }
    load();
  }, [session?.user]);

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Chat History</h1>

      {sessions.length === 0 ? (
        <EmptyState type="chat" onAction={() => router.push("/dashboard")} />
      ) : (
        <div className="space-y-3">
          {sessions.map((s, i) => (
            <motion.button
              key={s.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => router.push(`/chat/${s.id}`)}
              className="w-full text-left p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center shrink-0">
                  <MessageSquare size={18} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold truncate">{s.title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                      <FileText size={12} />
                      {s.document.title}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                      <Clock size={12} />
                      {new Date(s.updatedAt).toLocaleDateString()}
                    </span>
                    <span className="text-xs text-gray-400">
                      {s._count.messages} messages
                    </span>
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
