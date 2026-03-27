import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;
let _embeddingModel: GenerativeModel | null = null;
let _chatModel: GenerativeModel | null = null;

function getGenAI() {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  }
  return genAI;
}

function getEmbeddingModel() {
  if (!_embeddingModel) {
    _embeddingModel = getGenAI().getGenerativeModel({ model: "gemini-embedding-001" });
  }
  return _embeddingModel;
}

function getChatModel() {
  if (!_chatModel) {
    _chatModel = getGenAI().getGenerativeModel({ model: "gemini-2.5-flash" });
  }
  return _chatModel;
}

// --- Rate limiter: one Gemini call at a time with delay between calls ---
const API_DELAY_MS = 500; // 0.5s between API calls
let apiQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const task = apiQueue.then(async () => {
    const result = await fn();
    await new Promise((r) => setTimeout(r, API_DELAY_MS));
    return result;
  });
  // Update queue tail (swallow errors so queue keeps moving)
  apiQueue = task.catch(() => {});
  return task;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  return enqueue(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await getEmbeddingModel().embedContent({
        content: { parts: [{ text }], role: "user" },
        outputDimensionality: 1024,
      } as any);
      return Array.from(result.embedding.values);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("API key")) {
        throw new Error("Invalid Gemini API key. Please check your GEMINI_API_KEY in .env");
      }
      throw new Error(`Embedding generation failed: ${msg}`);
    }
  });
}

export async function generateAnswer(
  query: string,
  context: string,
  documentTitle: string
): Promise<ReadableStream<Uint8Array>> {
  const prompt = `You are a helpful AI assistant for a document Q&A application called Askify.
You answer questions based ONLY on the provided document context. If the answer is not found in the context, say so clearly.

Document: "${documentTitle}"

Context from the document:
---
${context}
---

User Question: ${query}

Instructions:
- Answer based strictly on the provided context
- Be concise but thorough
- If you quote from the document, use quotation marks
- If the context doesn't contain enough information to answer, say "I couldn't find enough information in the document to answer this question."
- Format your response in markdown for readability`;

  return enqueue(async () => {
    const result = await getChatModel().generateContentStream(prompt);

    const encoder = new TextEncoder();
    return new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });
  });
}
