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

  const documents = await prisma.document.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      fileName: true,
      fileSize: true,
      tags: true,
      status: true,
      createdAt: true,
      _count: { select: { chunks: true } },
    },
  });

  return NextResponse.json(documents);
}
