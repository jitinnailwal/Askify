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

  const document = await prisma.document.findFirst({
    where: { id, ...where },
    select: { status: true },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }
  return NextResponse.json({ status: document.status });
}
