import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chunkText } from "@/lib/chunker";
import { generateEmbedding } from "@/lib/gemini";
import { upsertVectors, deleteVectorsByDocument } from "@/lib/pinecone";
import { v4 as uuidv4 } from "uuid";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  const guestId = req.headers.get("x-guest-id");

  if (!session?.user?.id && !guestId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const document = await prisma.document.findUnique({ where: { id } });

  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner =
    (document.userId && document.userId === session?.user?.id) ||
    (document.guestId && document.guestId === guestId);

  if (!isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (document.status !== "error") {
    return NextResponse.json({ error: "Document is not in error state" }, { status: 400 });
  }

  // Reset status
  await prisma.document.update({
    where: { id },
    data: { status: "processing" },
  });

  // Reprocess in background
  processDocument(id, document.content).catch(console.error);

  return NextResponse.json({ status: "processing" });
}

async function processDocument(documentId: string, content: string) {
  try {
    // Clean up old chunks and vectors
    try {
      await deleteVectorsByDocument(documentId);
    } catch {
      // May not have vectors if previous processing failed early
    }
    await prisma.chunk.deleteMany({ where: { documentId } });

    const chunks = chunkText(content);
    console.log(`Reprocessing ${chunks.length} chunks for document ${documentId}`);

    // Process chunks one at a time: create in DB, embed, upsert to Pinecone
    for (const chunk of chunks) {
      const vectorId = uuidv4();

      const dbChunk = await prisma.chunk.create({
        data: {
          content: chunk.content,
          index: chunk.index,
          documentId,
          vectorId,
        },
      });

      console.log(`Chunk ${chunk.index + 1}/${chunks.length}: generating embedding...`);
      const embedding = await generateEmbedding(dbChunk.content);

      await upsertVectors([
        {
          id: vectorId,
          values: embedding,
          metadata: {
            documentId,
            chunkId: dbChunk.id,
            content: dbChunk.content.slice(0, 1000),
          },
        },
      ]);
      console.log(`Chunk ${chunk.index + 1}/${chunks.length}: done`);
    }

    await prisma.document.update({
      where: { id: documentId },
      data: { status: "ready" },
    });
    console.log(`Document ${documentId} reprocessing complete`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Reprocess error:", msg);
    console.error("Stack:", error instanceof Error ? error.stack : "");
    await prisma.document.update({
      where: { id: documentId },
      data: { status: "error" },
    });
  }
}
