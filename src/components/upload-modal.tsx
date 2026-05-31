"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, FileText, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { getGuestId } from "@/lib/guest";
import { useDialog } from "@/lib/use-dialog";

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function UploadModal({ open, onClose, onSuccess }: UploadModalProps) {
  const { data: session } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<"idle" | "uploading" | "processing" | "done" | "error">("idle");

  // Don't allow Esc/focus-restore to dismiss the modal mid-upload.
  const dialogRef = useDialog(open, () => {
    if (!uploading) onClose();
  });

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length > 0) {
      const f = accepted[0];
      setFile(f);
      if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
    }
  }, [title]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
      "text/markdown": [".md"],
    },
    maxSize: 20 * 1024 * 1024, // 20MB
    multiple: false,
  });

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress("uploading");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title || file.name);
      if (tags) formData.append("tags", tags);

      const headers: Record<string, string> = {};
      if (!session?.user) {
        const guestId = getGuestId();
        if (guestId) headers["x-guest-id"] = guestId;
      }

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        headers,
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      setProgress("processing");

      const data = await res.json();

      // Poll for processing completion
      const pollStatus = async () => {
        const statusRes = await fetch(`/api/documents/${data.id}/status`);
        const statusData = await statusRes.json();

        if (statusData.status === "ready") {
          setProgress("done");
          setTimeout(() => {
            toast.success("Document uploaded and processed!");
            onSuccess();
            resetForm();
          }, 1000);
        } else if (statusData.status === "error") {
          setProgress("error");
          toast.error("Document processing failed");
        } else {
          setTimeout(pollStatus, 2000);
        }
      };

      pollStatus();
    } catch (error) {
      setProgress("error");
      toast.error(error instanceof Error ? error.message : "Upload failed");
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setTitle("");
    setTags("");
    setUploading(false);
    setProgress("idle");
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={uploading ? undefined : onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="upload-modal-title"
              tabIndex={-1}
              className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden focus:outline-none"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
                <h2 id="upload-modal-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Upload Document
                </h2>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                {/* Dropzone */}
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                    isDragActive
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                      : file
                      ? "border-green-400 bg-green-50 dark:bg-green-950/20"
                      : "border-gray-300 dark:border-gray-700 hover:border-blue-400"
                  }`}
                >
                  <input {...getInputProps()} />
                  {file ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="text-green-500" size={24} />
                      <div className="text-left">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Upload className="mx-auto text-gray-400 mb-3" size={32} />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Drop a PDF, TXT, or MD file here, or click to browse
                      </p>
                      <p className="text-xs text-gray-400 mt-1">Max 20MB</p>
                    </div>
                  )}
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Document title"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="e.g. research, AI, notes"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Progress */}
                {progress !== "idle" && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                    {progress === "uploading" && (
                      <>
                        <Loader2 className="animate-spin text-blue-500" size={20} />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Uploading document...</span>
                      </>
                    )}
                    {progress === "processing" && (
                      <>
                        <Loader2 className="animate-spin text-blue-500" size={20} />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Processing & generating embeddings...</span>
                      </>
                    )}
                    {progress === "done" && (
                      <>
                        <CheckCircle className="text-green-500" size={20} />
                        <span className="text-sm text-green-600">Done! Document is ready.</span>
                      </>
                    )}
                    {progress === "error" && (
                      <>
                        <AlertCircle className="text-red-500" size={20} />
                        <span className="text-sm text-red-600">Processing failed. Please try again.</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-800">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  {uploading ? "Processing..." : "Upload & Process"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
