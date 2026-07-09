// src/app/api/finance/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const entries = await prisma.financeEntry.findMany({
      include: {
        category: true,
        financeType: true,
      },
      orderBy: {
        dueDate: "desc",
      },
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error("Erro ao buscar lançamentos financeiros:", error);
    return NextResponse.json(
      { error: "Erro ao buscar lançamentos financeiros." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.title?.trim()) {
      return NextResponse.json(
        { error: "Informe um título." },
        { status: 400 },
      );
    }

    if (body.amount === undefined || body.amount === null || body.amount === "") {
      return NextResponse.json(
        { error: "Informe um valor." },
        { status: 400 },
      );
    }

    if (!body.dueDate) {
      return NextResponse.json(
        { error: "Informe uma data." },
        { status: 400 },
      );
    }

    if (!body.categoryId) {
      return NextResponse.json(
        { error: "Selecione uma categoria." },
        { status: 400 },
      );
    }

    const created = await prisma.financeEntry.create({
      data: {
        title: body.title.trim(),
        amount: Number(body.amount),
        dueDate: new Date(body.dueDate),
        kind: body.kind ?? "A pagar",
        categoryId: body.categoryId,
        financeTypeId: body.financeTypeId || null,
        partner: body.partner ?? "",
        notes: body.notes ?? "",
        recurring: body.recurring ?? false,
        confirmed: body.confirmed ?? false,
        paid: body.paid ?? false,
        paidAt: body.paidAt ? new Date(body.paidAt) : null,
      },
      include: {
        category: true,
        financeType: true,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar lançamento financeiro:", error);
    return NextResponse.json(
      { error: "Erro ao criar lançamento financeiro." },
      { status: 500 },
    );
  }
}