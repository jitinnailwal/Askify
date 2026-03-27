import { Pinecone } from "@pinecone-database/pinecone";

let pineconeInstance: Pinecone | null = null;

function getPinecone() {
  if (!pineconeInstance) {
    if (!process.env.PINECONE_API_KEY) {
      throw new Error("PINECONE_API_KEY is not set in .env");
    }
    pineconeInstance = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
  }
  return pineconeInstance;
}

function getIndex() {
  const indexName = process.env.PINECONE_INDEX || "askify";
  return getPinecone().index(indexName);
}

export async function upsertVectors(
  vectors: { id: string; values: number[]; metadata: Record<string, string> }[]
) {
  try {
    const idx = getIndex();
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await idx.upsert(batch);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("404")) {
      throw new Error(
        `Pinecone index "${process.env.PINECONE_INDEX || "askify"}" not found. Create the index in your Pinecone dashboard with dimension 768 (for text-embedding-004).`
      );
    }
    throw new Error(`Pinecone upsert failed: ${msg}`);
  }
}

export async function queryVectors(
  embedding: number[],
  documentId: string,
  topK: number = 5
) {
  try {
    const idx = getIndex();
    const results = await idx.query({
      vector: embedding,
      topK,
      filter: { documentId: { $eq: documentId } },
      includeMetadata: true,
    });
    return results.matches || [];
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("404")) {
      throw new Error(
        `Pinecone index "${process.env.PINECONE_INDEX || "askify"}" not found. Create it in your Pinecone dashboard.`
      );
    }
    throw new Error(`Pinecone query failed: ${msg}`);
  }
}

export async function deleteVectorsByDocument(documentId: string) {
  const idx = getIndex();
  await idx.deleteMany({ filter: { documentId: { $eq: documentId } } });
}
