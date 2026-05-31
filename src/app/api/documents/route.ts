import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequester, ownerWhere } from "@/lib/identity";

export async function GET() {
  const requester = await getRequester();
  const where = ownerWhere(requester);
  if (!where) {
    return NextResponse.json({ documents: [] });
  }

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
    },
  });

  return NextResponse.json({ documents });
}
