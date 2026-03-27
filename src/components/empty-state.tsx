import { FileText, MessageSquare, Upload } from "lucide-react";

interface EmptyStateProps {
  type: "documents" | "chat" | "messages";
  onAction?: () => void;
}

const config = {
  documents: {
    icon: FileText,
    title: "No documents yet",
    description: "Upload your first document to start asking questions about it.",
    actionLabel: "Upload Document",
  },
  chat: {
    icon: MessageSquare,
    title: "No chat sessions",
    description: "Start a chat with one of your documents to begin.",
    actionLabel: "Go to Dashboard",
  },
  messages: {
    icon: MessageSquare,
    title: "Ask a question",
    description: "Type a question below to get AI-powered answers from your document.",
    actionLabel: undefined,
  },
};

export function EmptyState({ type, onAction }: EmptyStateProps) {
  const { icon: Icon, title, description, actionLabel } = config[type];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center mb-4">
        <Icon size={28} className="text-blue-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Upload size={16} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
