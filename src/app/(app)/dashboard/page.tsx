"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search,
  Plus,
  FileText,
  Clock,
  Tag,
  Trash2,
  MessageSquare,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { UploadModal } from "@/components/upload-modal";
import { ConfirmModal } from "@/components/confirm-modal";
import { EmptyState } from "@/components/empty-state";
import { DocumentCardSkeleton } from "@/components/skeleton";
import { getGuestId } from "@/lib/guest";
import toast from "react-hot-toast";

interface Document {
  id: string;
  title: string;
  fileName: string;
  fileSize: number;
  tags: string[];
  status: string;
  createdAt: string;
  _count: { chunks: number };
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (!session?.user) {
        const guestId = getGuestId();
        if (guestId) headers["x-guest-id"] = guestId;
      }

      const res = await fetch("/api/documents", { headers });
      if (res.ok) {
        setDocuments(await res.json());
      }
    } catch {
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [session?.user]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    if (searchParams.get("upload") === "true") {
      setUploadOpen(true);
    }
  }, [searchParams]);

  const handleDelete = async (id: string) => {
    try {
      const headers: Record<string, string> = {};
      if (!session?.user) {
        const guestId = getGuestId();
        if (guestId) headers["x-guest-id"] = guestId;
      }

      const res = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        setDocuments((d) => d.filter((doc) => doc.id !== id));
        toast.success("Document deleted");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete");
      }
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleRetry = async (id: string) => {
    try {
      const headers: Record<string, string> = {};
      if (!session?.user) {
        const guestId = getGuestId();
        if (guestId) headers["x-guest-id"] = guestId;
      }

      const res = await fetch(`/api/documents/${id}/reprocess`, {
        method: "POST",
        headers,
      });
      if (res.ok) {
        setDocuments((d) =>
          d.map((doc) => (doc.id === id ? { ...doc, status: "processing" } : doc))
        );
        toast.success("Reprocessing document...");
        // Poll for completion
        const poll = async () => {
          const statusRes = await fetch(`/api/documents/${id}/status`);
          const data = await statusRes.json();
          if (data.status === "ready" || data.status === "error") {
            setDocuments((d) =>
              d.map((doc) => (doc.id === id ? { ...doc, status: data.status } : doc))
            );
            if (data.status === "ready") toast.success("Document ready!");
            if (data.status === "error") toast.error("Processing failed again");
          } else {
            setTimeout(poll, 2000);
          }
        };
        setTimeout(poll, 3000);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to reprocess");
      }
    } catch {
      toast.error("Failed to reprocess");
    }
  };

  const startChat = async (docId: string) => {
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
        body: JSON.stringify({ documentId: docId }),
      });

      if (res.ok) {
        const chatSession = await res.json();
        router.push(`/chat/${chatSession.id}`);
      }
    } catch {
      toast.error("Failed to start chat");
    }
  };

  const filtered = documents.filter((doc) => {
    const q = search.toLowerCase();
    return (
      doc.title.toLowerCase().includes(q) ||
      doc.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1024 / 1024).toFixed(1) + " MB";
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-sm text-gray-500 mt-1">
            {documents.length} document{documents.length !== 1 ? "s" : ""} uploaded
          </p>
        </div>
        <button
          onClick={() => setUploadOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} />
          Upload Document
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search documents or tags..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Documents grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <DocumentCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        documents.length === 0 ? (
          <EmptyState type="documents" onAction={() => setUploadOpen(true)} />
        ) : (
          <p className="text-center text-gray-500 py-12">
            No documents match your search.
          </p>
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((doc, i) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center shrink-0">
                    <FileText size={18} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold truncate">{doc.title}</h3>
                    <p className="text-xs text-gray-500">
                      {formatSize(doc.fileSize)} &middot; {formatDate(doc.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {doc.status === "processing" && (
                    <Loader2 size={14} className="animate-spin text-blue-500" />
                  )}
                  {doc.status === "ready" && (
                    <CheckCircle size={14} className="text-green-500" />
                  )}
                  {doc.status === "error" && (
                    <AlertCircle size={14} className="text-red-500" />
                  )}
                </div>
              </div>

              {doc.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {doc.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full"
                    >
                      <Tag size={10} />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                {doc.status === "error" ? (
                  <button
                    onClick={() => handleRetry(doc.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-md transition-colors"
                  >
                    <RefreshCw size={14} />
                    Retry
                  </button>
                ) : (
                  <button
                    onClick={() => startChat(doc.id)}
                    disabled={doc.status !== "ready"}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md transition-colors disabled:opacity-50"
                  >
                    <MessageSquare size={14} />
                    Chat
                  </button>
                )}
                <button
                  onClick={() => router.push(`/document/${doc.id}`)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                >
                  <FileText size={14} />
                  View
                </button>
                <button
                  onClick={() => setDeleteTarget(doc.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
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
          fetchDocuments();
          setUploadOpen(false);
        }}
      />

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Document"
        message="Are you sure you want to delete this document? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
