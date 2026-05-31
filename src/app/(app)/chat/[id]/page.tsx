"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { Send, ArrowLeft, FileText, Loader2, Bot, User } from "lucide-react";
import toast from "react-hot-toast";
import { EmptyState } from "@/components/empty-state";
import { ChatMessageSkeleton } from "@/components/skeleton";
import { guestHeaders } from "@/lib/client-api";

interface Msg {
  id: string;
  role: string;
  content: string;
  sources: string[];
}

interface SessionData {
  id: string;
  title: string;
  document: { id: string; title: string; status: string };
  messages: Msg[];
}

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/chat/${id}`, { headers: guestHeaders() });
        if (!res.ok) {
          setSession(null);
          return;
        }
        const data = await res.json();
        setSession(data.session);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages, streaming]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || sending || !session) return;

    setInput("");
    setSending(true);
    setStreaming("");

    // Optimistically show the user's message.
    const userMsg: Msg = { id: `tmp-${Date.now()}`, role: "user", content: question, sources: [] };
    setSession((prev) => (prev ? { ...prev, messages: [...prev.messages, userMsg] } : prev));

    try {
      const res = await fetch(`/api/chat/${id}/message`, {
        method: "POST",
        headers: guestHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ content: question }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to get an answer.");
      }

      let sources: string[] = [];
      try {
        const raw = res.headers.get("X-Sources");
        if (raw) sources = JSON.parse(decodeURIComponent(raw));
      } catch {
        /* ignore malformed sources header */
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      // Batch token updates to one render per animation frame instead of
      // re-rendering the message list on every chunk.
      let rafId = 0;
      const flush = () => {
        rafId = 0;
        setStreaming(full);
      };
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        if (!rafId) rafId = requestAnimationFrame(flush);
      }
      if (rafId) cancelAnimationFrame(rafId);

      const assistantMsg: Msg = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: full,
        sources,
      };
      setSession((prev) =>
        prev ? { ...prev, messages: [...prev.messages, assistantMsg] } : prev
      );
      setStreaming("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
      // Roll back the optimistic user message on failure.
      setSession((prev) =>
        prev ? { ...prev, messages: prev.messages.filter((m) => m.id !== userMsg.id) } : prev
      );
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <ChatMessageSkeleton />
        <ChatMessageSkeleton />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 mb-4">This chat could not be found.</p>
        <Link href="/chat" className="text-blue-600 hover:underline">
          Back to chats
        </Link>
      </div>
    );
  }

  const hasMessages = session.messages.length > 0 || streaming;

  return (
    <div className="flex flex-col h-[calc(100dvh-6.5rem)] lg:h-[calc(100dvh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => router.push("/chat")}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0">
          <h1 className="font-semibold truncate">{session.title}</h1>
          <p className="flex items-center gap-1 text-xs text-gray-500 truncate">
            <FileText size={12} /> {session.document.title}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-5">
        {!hasMessages ? (
          <EmptyState type="messages" />
        ) : (
          <>
            {session.messages.map((m) => (
              <MessageBubble key={m.id} role={m.role} content={m.content} sources={m.sources} />
            ))}
            {streaming && <MessageBubble role="assistant" content={streaming} sources={[]} />}
            {sending && !streaming && (
              <div className="flex items-center gap-2 text-sm text-gray-400 pl-11">
                <Loader2 size={14} className="animate-spin" /> Thinking…
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form
        onSubmit={send}
        className="pt-4 border-t border-gray-200 dark:border-gray-800 flex items-end gap-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(e);
            }
          }}
          rows={1}
          placeholder="Ask a question about this document…"
          className="flex-1 resize-none px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-32"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="p-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition-colors shrink-0"
          aria-label="Send"
        >
          {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </form>
    </div>
  );
}

function MessageBubble({
  role,
  content,
  sources,
}: {
  role: string;
  content: string;
  sources: string[];
}) {
  const isUser = role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
        }`}
      >
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>
      <div className={`max-w-[80%] ${isUser ? "text-right" : ""}`}>
        <div
          className={`inline-block text-left px-4 py-2.5 rounded-2xl text-sm ${
            isUser
              ? "bg-blue-600 text-white"
              : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
          }`}
        >
          {isUser ? (
            <span className="whitespace-pre-wrap">{content}</span>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-pre:my-2">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          )}
        </div>
        {!isUser && sources.length > 0 && (
          <details className="mt-2 text-left">
            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300">
              {sources.length} source{sources.length > 1 ? "s" : ""}
            </summary>
            <div className="mt-2 space-y-1.5">
              {sources.map((s, i) => (
                <p
                  key={i}
                  className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800/60 rounded-lg p-2 border border-gray-100 dark:border-gray-800"
                >
                  {s}
                </p>
              ))}
            </div>
          </details>
        )}
      </div>
    </motion.div>
  );
}
