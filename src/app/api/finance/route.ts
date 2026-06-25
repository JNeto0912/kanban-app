// src/app/api/finance/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const entries = await prisma.financeEntry.findMany({
    include: { category: true },
    orderBy: { dueDate: "asc" },
  });
  return NextResponse.json(entries);
}

export async function POST(req: Request) {
  const body = await req.json();

  const entry = await prisma.financeEntry.create({
    data: {
      title:      body.title,
      amount:     Number(body.amount),
      dueDate:    new Date(body.dueDate),
      kind:       body.kind,
      categoryId: body.categoryId,
      partner:    body.partner ?? "",
      notes:      body.notes ?? "",
      recurring:  Boolean(body.recurring),
    },
    include: { category: true },
  });

  return NextResponse.json(entry, { status: 201 });
}