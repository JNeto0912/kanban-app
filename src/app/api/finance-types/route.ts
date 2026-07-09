// src/app/api/finance-types/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");
  const kind = searchParams.get("kind");

  const where: {
    active?: boolean;
    categoryId?: string;
    kind?: string;
  } = { active: true };

  if (categoryId) where.categoryId = categoryId;
  if (kind) where.kind = kind;

  const types = await prisma.financeType.findMany({
    where,
    include: { category: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(types);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.name?.trim() || !body.kind || !body.categoryId) {
    return NextResponse.json(
      { error: "Nome, tipo e categoria são obrigatórios." },
      { status: 400 },
    );
  }

  const created = await prisma.financeType.create({
    data: {
      name: body.name.trim(),
      kind: body.kind,
      categoryId: body.categoryId,
    },
    include: { category: true },
  });

  return NextResponse.json(created, { status: 201 });
}