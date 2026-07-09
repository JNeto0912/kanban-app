// src/app/api/finance/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ---------- GET ----------
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const entry = await prisma.financeEntry.findUnique({
    where: { id },
    include: { category: true, financeType: true },
  });

  if (!entry) {
    return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });
  }

  return NextResponse.json(entry);
}

// ---------- PUT ----------
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body   = await req.json();

  const updated = await prisma.financeEntry.update({
    where: { id },
    data: {
      title:         body.title,
      amount:        Number(body.amount),
      dueDate:       new Date(body.dueDate),
      kind:          body.kind,
      categoryId:    body.categoryId,
      financeTypeId: body.financeTypeId ?? null, // ← novo
      partner:       body.partner  ?? "",
      notes:         body.notes    ?? "",
      recurring:     body.recurring ?? false,
      confirmed:     body.confirmed ?? false,
      paid:          body.paid      ?? false,
      paidAt:        body.paidAt    ? new Date(body.paidAt) : null,
    },
    include: { category: true, financeType: true }, // ← inclui financeType
  });

  return NextResponse.json(updated);
}

// ---------- DELETE ----------
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  await prisma.financeEntry.delete({ where: { id } });
  return NextResponse.json({ success: true });
}