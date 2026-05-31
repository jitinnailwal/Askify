import { prisma } from "./prisma";
import { chunkText } from "./chunker";
import { generateEmbedding } from "./gemini";
import { upsertVectors } from "./pinecone";

/**
 * Background pipeline for a freshly-uploaded document:
 * chunk the extracted text -> embed each chunk -> upsert vectors to Pinecone
 * -> persist chunks -> flip the document status to "ready" (or "error").
 *
 * Fire-and-forget: callers should NOT await this so the upload request can
 * return immediately while the client polls the status endpoint.
 */
export async function processDocument(documentId: string, text: string): Promise<void> {
  try {
    const chunks = chunkText(text);
    if (chunks.length === 0) {
      throw new Error("No extractable text found in the document.");
    }

    const vectors: { id: string; values: number[]; metadata: Record<string, string> }[] = [];

    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk.content);
      const vectorId = `${documentId}-${chunk.index}`;
      vectors.push({
        id: vectorId,
        values: embedding,
        metadata: {
          documentId,
          index: String(chunk.index),
          content: chunk.content,
        },
      });
    }

    await upsertVectors(vectors);

    await prisma.chunk.createMany({
      data: chunks.map((c) => ({
        documentId,
        content: c.content,
        index: c.index,
        vectorId: `${documentId}-${c.index}`,
      })),
    });

    await prisma.document.update({
      where: { id: documentId },
      data: { status: "ready" },
    });
  } catch (error) {
    console.error(`[processDocument:${documentId}] failed:`, error);
    await prisma.document
      .update({ where: { id: documentId }, data: { status: "error" } })
      .catch(() => {});
  }
}
