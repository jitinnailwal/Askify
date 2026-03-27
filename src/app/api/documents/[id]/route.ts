import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteVectorsByDocument } from "@/lib/pinecone";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  const guestId = req.headers.get("x-guest-id");

  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      chunks: { orderBy: { index: "asc" } },
      _count: { select: { chatSessions: true } },
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Verify ownership
  const isOwner =
    (document.userId && document.userId === session?.user?.id) ||
    (document.guestId && document.guestId === guestId);

  if (!isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(document);
}

export async function DELETE(
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

  // Verify ownership
  const isOwner =
    (document.userId && document.userId === session?.user?.id) ||
    (document.guestId && document.guestId === guestId);

  if (!isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await deleteVectorsByDocument(id);
  } catch {
    // Vectors may not exist if processing failed
  }
  await prisma.document.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
