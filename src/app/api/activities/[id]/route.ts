import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();

  const activity = await prisma.activity.update({
    where: { id },
    data: {
      title:       body.title,
      description: body.description ?? "",
      client:      body.client ?? "",
      status:      body.status,
      categoryId:  body.categoryId,
    },
    include: { category: true },
  });

  return NextResponse.json(activity);
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  await prisma.activity.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}