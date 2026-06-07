import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequester } from "@/lib/identity";
import { parsePDF, parseText } from "@/lib/pdf-parser";
import { processDocument } from "@/lib/process";
import { GUEST_LIMITS } from "@/lib/guest";

export const maxDuration = 60;

const MAX_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(req: Request) {
  try {
    const requester = await getRequester();
    if (!requester.userId && !requester.guestId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // Enforce the free-tier document cap for guests.
    if (requester.guestId) {
      const count = await prisma.document.count({
        where: { guestId: requester.guestId },
      });
      if (count >= GUEST_LIMITS.maxDocuments) {
        return NextResponse.json(
          { error: "Guest limit reached. Sign in to upload more documents." },
          { status: 403 }
        );
      }
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const title = (formData.get("title") as string | null)?.trim();
    const tagsRaw = (formData.get("tags") as string | null) || "";

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File exceeds the 20MB limit." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase();

    let content: string;
    if (name.endsWith(".pdf") || file.type === "application/pdf") {
      content = await parsePDF(buffer);
    } else if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) {
      content = parseText(buffer.toString("utf-8"));
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Upload a PDF, TXT, or MD file." },
        { status: 400 }
      );
    }

    if (!content.trim()) {
      return NextResponse.json(
        { error: "Could not extract any text from this file." },
        { status: 422 }
      );
    }

    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const document = await prisma.document.create({
      data: {
        title: title || file.name,
        fileName: file.name,
        fileSize: file.size,
        content,
        tags,
        status: "processing",
        userId: requester.userId,
        guestId: requester.guestId,
      },
      select: { id: true, status: true },
    });

    // Run embedding/indexing after the response is sent. On serverless
    // platforms (Vercel) `after` extends the function lifetime via waitUntil so
    // the work actually completes — a bare `void` promise would be dropped the
    // moment the function returns, leaving the document stuck in "processing".
    // The client polls the status endpoint while this runs.
    after(() => processDocument(document.id, content));

    return NextResponse.json({ id: document.id, status: document.status }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Upload failed.";
    console.error("[upload] error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
