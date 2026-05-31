import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequester, ownerWhere } from "@/lib/identity";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requester = await getRequester();
  const where = ownerWhere(requester);
  if (!where) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const session = await prisma.chatSession.findFirst({
    where: { id, ...where },
    select: {
      id: true,
      title: true,
      document: { select: { id: true, title: true, status: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, role: true, content: true, sources: true, createdAt: true },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Chat session not found." }, { status: 404 });
  }
  return NextResponse.json({ session });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requester = await getRequester();
  const where = ownerWhere(requester);
  if (!where) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const session = await prisma.chatSession.findFirst({ where: { id, ...where } });
  if (!session) {
    return NextResponse.json({ error: "Chat session not found." }, { status: 404 });
  }

  await prisma.chatSession.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
