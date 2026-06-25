import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();

  const entry = await prisma.financeEntry.update({
    where: { id },
    data: {
      title:      body.title,
      amount:     Number(body.amount),
      dueDate:    new Date(body.dueDate),
      kind:       body.kind,
      categoryId: body.categoryId,
      partner:    body.partner ?? "",
      notes:      body.notes ?? "",
      recurring:  Boolean(body.recurring),
      paid:       Boolean(body.paid),
      paidAt:     body.paid ? new Date(body.paidAt ?? Date.now()) : null,
    },
    include: { category: true },
  });

  return NextResponse.json(entry);
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  await prisma.financeEntry.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}