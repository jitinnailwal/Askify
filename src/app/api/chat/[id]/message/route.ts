import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequester, ownerWhere } from "@/lib/identity";
import { generateEmbedding, generateAnswer } from "@/lib/gemini";
import { queryVectors } from "@/lib/pinecone";
import { GUEST_LIMITS } from "@/lib/guest";

export const maxDuration = 60;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const requester = await getRequester();
    const where = ownerWhere(requester);
    if (!where) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { content } = await req.json();
    const query = typeof content === "string" ? content.trim() : "";
    if (!query) {
      return NextResponse.json({ error: "Question is required." }, { status: 400 });
    }

    const session = await prisma.chatSession.findFirst({
      where: { id, ...where },
      select: { id: true, document: { select: { id: true, title: true, status: true } } },
    });
    if (!session) {
      return NextResponse.json({ error: "Chat session not found." }, { status: 404 });
    }
    if (session.document.status !== "ready") {
      return NextResponse.json(
        { error: "This document is still being processed. Try again shortly." },
        { status: 409 }
      );
    }

    // Enforce the free-tier question cap for guests.
    if (requester.guestId) {
      const asked = await prisma.message.count({
        where: { role: "user", chatSession: { guestId: requester.guestId } },
      });
      if (asked >= GUEST_LIMITS.maxQuestions) {
        return NextResponse.json(
          { error: "Guest question limit reached. Sign in to ask more." },
          { status: 403 }
        );
      }
    }

    // --- Retrieval ---
    const embedding = await generateEmbedding(query);
    const matches = await queryVectors(embedding, session.document.id, 5);
    const context = matches
      .map((m) => (m.metadata?.content as string) || "")
      .filter(Boolean)
      .join("\n\n---\n\n");
    const sources = matches
      .map((m) => (m.metadata?.content as string) || "")
      .filter(Boolean)
      .map((c) => (c.length > 160 ? c.slice(0, 160) + "…" : c));

    // Persist the user's message and bump the session timestamp.
    await prisma.message.create({
      data: { role: "user", content: query, chatSessionId: session.id },
    });
    await prisma.chatSession.update({
      where: { id: session.id },
      data: { updatedAt: new Date() },
    });

    // --- Generation (streamed) ---
    const aiStream = await generateAnswer(
      query,
      context || "(no relevant context was found in the document)",
      session.document.title
    );

    // Tee the stream so we can persist the full assistant reply on completion
    // while still streaming bytes to the client unchanged.
    let full = "";
    const decoder = new TextDecoder();
    const transform = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        full += decoder.decode(chunk, { stream: true });
        controller.enqueue(chunk);
      },
      async flush() {
        await prisma.message
          .create({
            data: {
              role: "assistant",
              content: full,
              sources,
              chatSessionId: session.id,
            },
          })
          .catch((e) => console.error(`[chat.message:${id}] save reply failed:`, e));
      },
    });

    return new Response(aiStream.pipeThrough(transform), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Sources": encodeURIComponent(JSON.stringify(sources)),
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to answer.";
    console.error("[chat.message] error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
