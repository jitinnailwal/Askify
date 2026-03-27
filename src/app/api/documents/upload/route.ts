import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsePDF, parseText } from "@/lib/pdf-parser";
import { chunkText } from "@/lib/chunker";
import { generateEmbedding } from "@/lib/gemini";
import { upsertVectors } from "@/lib/pinecone";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const guestId = req.headers.get("x-guest-id");

    if (!session?.user?.id && !guestId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check guest limits
    if (!session?.user?.id && guestId) {
      const guestDocs = await prisma.document.count({ where: { guestId } });
      if (guestDocs >= 1) {
        return NextResponse.json(
          { error: "Guest limit reached. Please sign up to upload more documents." },
          { status: 403 }
        );
      }
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const title = (formData.get("title") as string) || file.name;
    const tagsRaw = formData.get("tags") as string;
    const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Parse file content
    const buffer = Buffer.from(await file.arrayBuffer());
    let content: string;

    if (file.type === "application/pdf") {
      content = await parsePDF(buffer);
    } else {
      content = parseText(buffer.toString("utf-8"));
    }

    if (!content.trim()) {
      return NextResponse.json(
        { error: "Could not extract text from file" },
        { status: 400 }
      );
    }

    // Create document
    const document = await prisma.document.create({
      data: {
        title,
        fileName: file.name,
        fileSize: file.size,
        content,
        tags,
        status: "processing",
        userId: session?.user?.id || null,
        guestId: session?.user?.id ? null : guestId,
      },
    });

    // Process in background (chunking + embeddings)
    processDocument(document.id, content).catch(console.error);

    return NextResponse.json({
      id: document.id,
      title: document.title,
      status: "processing",
    });
  } catch (error) {
    console.error("Upload error:", error instanceof Error ? error.message : error);
    console.error("Stack:", error instanceof Error ? error.stack : "");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}

async function processDocument(documentId: string, content: string) {
  try {
    const chunks = chunkText(content);
    console.log(`Processing ${chunks.length} chunks for document ${documentId}`);

    // Create chunks sequentially and generate embeddings one at a time
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
    console.log(`Document ${documentId} processing complete`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Processing error:", msg);
    console.error("Stack:", error instanceof Error ? error.stack : "");
    await prisma.document.update({
      where: { id: documentId },
      data: { status: "error" },
    });
  }
}
