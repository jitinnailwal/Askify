import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequester, ownerWhere } from "@/lib/identity";

// List the requester's chat sessions (most recent first).
export async function GET() {
  const requester = await getRequester();
  const where = ownerWhere(requester);
  if (!where) return NextResponse.json({ sessions: [] });

  const sessions = await prisma.chatSession.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      updatedAt: true,
      document: { select: { id: true, title: true } },
    },
  });

  return NextResponse.json({ sessions });
}

// Create a new chat session for one of the requester's documents.
export async function POST(req: Request) {
  const requester = await getRequester();
  const where = ownerWhere(requester);
  if (!where) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { documentId } = await req.json();
  if (!documentId) {
    return NextResponse.json({ error: "documentId is required." }, { status: 400 });
  }

  const document = await prisma.document.findFirst({
    where: { id: documentId, ...where },
    select: { id: true, title: true },
  });
  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const session = await prisma.chatSession.create({
    data: {
      documentId: document.id,
      title: document.title,
      userId: requester.userId,
      guestId: requester.guestId,
    },
    select: { id: true },
  });

  return NextResponse.json({ id: session.id }, { status: 201 });
}
