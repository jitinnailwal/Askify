"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Plus,
  FileText,
  Trash2,
  MessageSquare,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { UploadModal } from "@/components/upload-modal";
import { ConfirmModal } from "@/components/confirm-modal";
import { EmptyState } from "@/components/empty-state";
import { DocumentCardSkeleton } from "@/components/skeleton";
import { guestHeaders } from "@/lib/client-api";

interface DocItem {
  id: string;
  title: string;
  fileName: string;
  fileSize: number;
  tags: string[];
  status: string;
  createdAt: string;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ready") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
        <CheckCircle size={13} /> Ready
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
        <AlertCircle size={13} /> Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400">
      <Loader2 size={13} className="animate-spin" /> Processing
    </span>
  );
}

function DashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DocItem | null>(null);
  const [starting, setStarting] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/documents", { headers: guestHeaders() });
      const data = await res.json();
      setDocs(data.documents || []);
    } catch {
      toast.error("Failed to load documents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Open the upload modal when navigated to with ?upload=true (sidebar link).
  useEffect(() => {
    if (searchParams.get("upload") === "true") setUploadOpen(true);
  }, [searchParams]);

  // Poll while any document is still processing.
  useEffect(() => {
    if (!docs.some((d) => d.status === "processing")) return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [docs, load]);

  const startChat = async (doc: DocItem) => {
    if (doc.status !== "ready") {
      toast.error("Document is still processing.");
      return;
    }
    setStarting(doc.id);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: guestHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ documentId: doc.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start chat");
      router.push(`/chat/${data.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start chat");
      setStarting(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    setDocs((prev) => prev.filter((d) => d.id !== id));
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
        headers: guestHeaders(),
      });
      if (!res.ok) throw new Error();
      toast.success("Document deleted.");
    } catch {
      toast.error("Failed to delete. Refreshing…");
      load();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-sm text-gray-500 mt-1">
            Upload and manage your knowledge base.
          </p>
        </div>
        <button
          onClick={() => setUploadOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} /> Upload
        </button>
      </div>

      {loading ? (
        <div className="grid gap-3">
          <DocumentCardSkeleton />
          <DocumentCardSkeleton />
          <DocumentCardSkeleton />
        </div>
      ) : docs.length === 0 ? (
        <EmptyState type="documents" onAction={() => setUploadOpen(true)} />
      ) : (
        <div className="grid gap-3">
          {docs.map((doc, i) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center shrink-0">
                <FileText size={18} className="text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <p className="font-medium truncate">{doc.title}</p>
                  <StatusBadge status={doc.status} />
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-gray-500">
                    {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
                  </span>
                  {doc.tags.map((t) => (
                    <span
                      key={t}
                      className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => startChat(doc)}
                  disabled={doc.status !== "ready" || starting === doc.id}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {starting === doc.id ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <MessageSquare size={15} />
                  )}
                  Chat
                </button>
                <button
                  onClick={() => setDeleteTarget(doc)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                  aria-label="Delete document"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={() => {
          setUploadOpen(false);
          load();
        }}
      />
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete document?"
        message={`"${deleteTarget?.title}" and its chat history will be permanently removed.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-gray-400">Loading…</div>}>
      <DashboardInner />
    </Suspense>
  );
}
