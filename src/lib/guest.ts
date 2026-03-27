const GUEST_LIMITS = {
  maxDocuments: 1,
  maxQuestions: 1,
};

export function getGuestId(): string | null {
  if (typeof window === "undefined") return null;
  let guestId = localStorage.getItem("askify_guest_id");
  if (!guestId) {
    guestId = `guest_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem("askify_guest_id", guestId);
  }
  return guestId;
}

export function getGuestUsage(): { documents: number; questions: number } {
  if (typeof window === "undefined") return { documents: 0, questions: 0 };
  const usage = localStorage.getItem("askify_guest_usage");
  return usage ? JSON.parse(usage) : { documents: 0, questions: 0 };
}

export function incrementGuestUsage(type: "documents" | "questions") {
  const usage = getGuestUsage();
  usage[type]++;
  localStorage.setItem("askify_guest_usage", JSON.stringify(usage));
}

export function canGuestUpload(): boolean {
  return getGuestUsage().documents < GUEST_LIMITS.maxDocuments;
}

export function canGuestAsk(): boolean {
  return getGuestUsage().questions < GUEST_LIMITS.maxQuestions;
}

export { GUEST_LIMITS };
