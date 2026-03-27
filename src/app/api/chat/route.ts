import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  const guestId = req.headers.get("x-guest-id");

  if (!session?.user?.id && !guestId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const where = session?.user?.id
    ? { userId: session.user.id }
    : { guestId: guestId! };

  const sessions = await prisma.chatSession.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      document: { select: { title: true } },
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const guestId = req.headers.get("x-guest-id");
  const { documentId } = await req.json();

  if (!session?.user?.id && !guestId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify document ownership before creating chat
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { userId: true, guestId: true },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  if (document.userId && document.userId !== session?.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (document.guestId && document.guestId !== guestId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const chatSession = await prisma.chatSession.create({
    data: {
      documentId,
      userId: session?.user?.id || null,
      guestId: session?.user?.id ? null : guestId || null,
    },
  });

  return NextResponse.json(chatSession);
}
