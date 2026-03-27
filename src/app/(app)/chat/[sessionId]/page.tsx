"use client";

import { useState, useEffect, useRef, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import {
  Send,
  FileText,
  Loader2,
  Bot,
  User,
  ChevronDown,
  BookOpen,
  ArrowLeft,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ChatMessageSkeleton } from "@/components/skeleton";
import { getGuestId } from "@/lib/guest";
import toast from "react-hot-toast";
import Link from "next/link";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: string[];
  createdAt: string;
}

interface Source {
  id: string;
  index: number;
  preview: string;
}

export default function ChatPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [docTitle, setDocTitle] = useState("");
  const [docId, setDocId] = useState("");
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [showSources, setShowSources] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/chat/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
        setDocTitle(data.document.title);
        setDocId(data.document.id);
      }
      setLoading(false);
    }
    load();
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamText]);

  const handleSend = async () => {
    const query = input.trim();
    if (!query || streaming) return;

    setInput("");
    setStreaming(true);
    setStreamText("");
    setSources([]);

    // Optimistic user message
    const userMsg: Message = {
      id: `temp_${Date.now()}`,
      role: "user",
      content: query,
      sources: [],
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (!session?.user) {
        const guestId = getGuestId();
        if (guestId) headers["x-guest-id"] = guestId;
      }

      const res = await fetch(`/api/chat/${sessionId}/message`, {
        method: "POST",
        headers,
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to get response");
      }

      // Parse sources from header
      const sourcesHeader = res.headers.get("X-Sources");
      if (sourcesHeader) {
        try {
          setSources(JSON.parse(decodeURIComponent(sourcesHeader)));
        } catch {
          // ignore
        }
      }

      // Stream response
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          setStreamText(fullText);
        }
      }

      // Add assistant message
      setMessages((prev) => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          role: "assistant",
          content: fullText,
          sources: [],
          createdAt: new Date().toISOString(),
        },
      ]);
      setStreamText("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 128) + "px";
  };

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <ChatMessageSkeleton />
        <ChatMessageSkeleton />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen lg:h-screen">
      {/* Header */}
      <div className="shrink-0 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold truncate">{docTitle}</h2>
            <p className="text-xs text-gray-500">AI-powered document Q&A</p>
          </div>
          <Link
            href={`/document/${docId}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
          >
            <BookOpen size={14} />
            View Doc
          </Link>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {messages.length === 0 && !streaming && (
            <EmptyState type="messages" />
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {streaming && streamText && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
                <Bot size={16} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{streamText}</ReactMarkdown>
                <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-0.5" />
              </div>
            </div>
          )}

          {streaming && !streamText && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
                <Bot size={16} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 size={14} className="animate-spin" />
                Thinking...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Sources panel */}
      {sources.length > 0 && (
        <div className="shrink-0 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <button
            onClick={() => setShowSources(!showSources)}
            className="w-full px-4 py-2 flex items-center justify-between text-xs font-medium text-gray-500"
          >
            <span>{sources.length} sources used</span>
            <ChevronDown
              size={14}
              className={`transition-transform ${showSources ? "rotate-180" : ""}`}
            />
          </button>
          {showSources && (
            <div className="px-4 pb-3 space-y-2 max-h-40 overflow-y-auto">
              {sources.map((s) => (
                <div
                  key={s.id}
                  className="p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400"
                >
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    Chunk #{s.index + 1}
                  </span>
                  : {s.preview}...
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <div className="max-w-3xl mx-auto flex gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your document..."
            rows={1}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-32"
            style={{ minHeight: "42px" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || streaming}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
          >
            {streaming ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isUser
            ? "bg-gray-200 dark:bg-gray-700"
            : "bg-blue-100 dark:bg-blue-900"
        }`}
      >
        {isUser ? (
          <User size={16} className="text-gray-600 dark:text-gray-400" />
        ) : (
          <Bot size={16} className="text-blue-600 dark:text-blue-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        {isUser ? (
          <p className="text-sm">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </motion.div>
  );
}
