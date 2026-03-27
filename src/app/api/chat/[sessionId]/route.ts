import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  const chatSession = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      document: { select: { id: true, title: true } },
    },
  });

  if (!chatSession) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(chatSession);
}
