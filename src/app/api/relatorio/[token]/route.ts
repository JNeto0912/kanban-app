// src/app/api/relatorio/[token]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const { searchParams } = new URL(req.url);

  const month = Number(searchParams.get("month") ?? new Date().getMonth() + 1);
  const year  = Number(searchParams.get("year")  ?? new Date().getFullYear());

  // valida o token
  const shareLink = await prisma.financeShareLink.findUnique({
    where: { token },
    include: { category: true },
  });

  if (!shareLink || !shareLink.active) {
    return NextResponse.json(
      { error: "Link inválido ou expirado." },
      { status: 404 },
    );
  }

  if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "Este link expirou." },
      { status: 410 },
    );
  }

  // intervalo do mês solicitado
  const from = new Date(year, month - 1, 1);
  const to   = new Date(year, month, 0, 23, 59, 59);

  // busca todas as entradas da categoria no intervalo
  const entries = await prisma.financeEntry.findMany({
    where: {
      categoryId: shareLink.categoryId,
      dueDate:    { gte: from, lte: to },
    },
    include: { financeType: true },
    orderBy: { dueDate: "asc" },
  });

  // ---------- cálculos de resumo ----------
  const toPayOpen = entries
    .filter((e) => e.kind === "A pagar" && !e.paid)
    .reduce((s, e) => s + e.amount, 0);

  const toPayPaid = entries
    .filter((e) => e.kind === "A pagar" && e.paid)
    .reduce((s, e) => s + e.amount, 0);

  const toReceivePending = entries
    .filter((e) => e.kind === "A receber" && !e.paid)
    .reduce((s, e) => s + e.amount, 0);

  const toReceiveReceived = entries
    .filter((e) => e.kind === "A receber" && e.paid)
    .reduce((s, e) => s + e.amount, 0);

  const balance = toReceiveReceived + toReceivePending - toPayPaid - toPayOpen;

  // ---------- totais por subtipo ----------
  const paidByType: Record<string, number> = {};
  const receivedByType: Record<string, number> = {};

  entries.forEach((e) => {
    const sub = e.financeType?.name ?? "Sem subtipo";

    if (e.kind === "A pagar" && e.paid) {
      paidByType[sub] = (paidByType[sub] ?? 0) + e.amount;
    }

    if (e.kind === "A receber" && e.paid) {
      receivedByType[sub] = (receivedByType[sub] ?? 0) + e.amount;
    }
  });

  // ---------- itens discriminados ----------
  const items = entries.map((e) => ({
    id:               e.id,
    title:            e.title,
    dueDate:          e.dueDate,
    amount:           e.amount,
    kind:             e.kind,
    paid:             e.paid,
    financeTypeName:  e.financeType?.name ?? "Sem subtipo",
    confirmed:        e.confirmed,
  }));

  // ---------- resposta ----------
  return NextResponse.json({
    category: shareLink.category.name,
    month,
    year,
    summary: {
      toPayOpen,
      toPayPaid,
      toReceivePending,
      toReceiveReceived,
      balance,
    },
    paidByType,
    receivedByType,
    items,               // <-- nova propriedade
  });
}