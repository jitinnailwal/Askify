import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateEmbedding, generateAnswer } from "@/lib/gemini";
import { queryVectors } from "@/lib/pinecone";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const session = await auth();
    const guestId = req.headers.get("x-guest-id");
    const { query } = await req.json();

    if (!query?.trim()) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Guest rate limiting
    if (!session?.user?.id && guestId) {
      const guestMessages = await prisma.message.count({
        where: {
          chatSession: { guestId },
          role: "user",
        },
      });
      if (guestMessages >= 1) {
        return NextResponse.json(
          { error: "Guest limit reached. Please sign up to continue chatting." },
          { status: 403 }
        );
      }
    }

    // Get chat session with document
    const chatSession = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { document: true },
    });

    if (!chatSession) {
      return NextResponse.json({ error: "Chat session not found" }, { status: 404 });
    }

    // Save user message
    await prisma.message.create({
      data: {
        role: "user",
        content: query,
        chatSessionId: sessionId,
      },
    });

    // Check document is ready
    if (chatSession.document.status !== "ready") {
      return NextResponse.json(
        { error: "Document is still processing or failed. Please wait or re-upload." },
        { status: 400 }
      );
    }

    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);

    // Search for relevant chunks
    const matches = await queryVectors(queryEmbedding, chatSession.documentId, 5);

    // Get chunk details from DB
    const chunkIds = matches
      .map((m) => m.metadata?.chunkId as string)
      .filter(Boolean);

    const chunks = await prisma.chunk.findMany({
      where: { id: { in: chunkIds } },
      orderBy: { index: "asc" },
    });

    // Build context
    const context = chunks.map((c) => c.content).join("\n\n---\n\n");

    // Generate streaming response
    const stream = await generateAnswer(
      query,
      context,
      chatSession.document.title
    );

    // Collect full response for saving
    const [streamForResponse, streamForSave] = stream.tee();

    // Save response asynchronously
    saveAssistantMessage(streamForSave, sessionId, chunkIds).catch(console.error);

    // Update chat session title if first message
    const msgCount = await prisma.message.count({
      where: { chatSessionId: sessionId },
    });
    if (msgCount <= 1) {
      prisma.chatSession
        .update({
          where: { id: sessionId },
          data: { title: query.slice(0, 100) },
        })
        .catch(console.error);
    }

    return new Response(streamForResponse, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "X-Sources": encodeURIComponent(JSON.stringify(
          chunks.map((c) => ({
            id: c.id,
            index: c.index,
            preview: c.content.slice(0, 200),
          }))
        )),
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}

async function saveAssistantMessage(
  stream: ReadableStream<Uint8Array>,
  chatSessionId: string,
  sourceChunkIds: string[]
) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    fullText += decoder.decode(value, { stream: true });
  }

  await prisma.message.create({
    data: {
      role: "assistant",
      content: fullText,
      sources: sourceChunkIds,
      chatSessionId,
    },
  });
}
