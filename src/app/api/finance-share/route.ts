// src/app/api/finance-share/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET — busca link ativo da Igreja
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");

  if (!categoryId) {
    return NextResponse.json(
      { error: "categoryId é obrigatório." },
      { status: 400 },
    );
  }

  const link = await prisma.financeShareLink.findFirst({
    where: { categoryId, active: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(link ?? null);
}

// POST — cria novo link
export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.categoryId) {
    return NextResponse.json(
      { error: "categoryId é obrigatório." },
      { status: 400 },
    );
  }

  // desativa links anteriores da mesma categoria
  await prisma.financeShareLink.updateMany({
    where: { categoryId: body.categoryId, active: true },
    data:  { active: false },
  });

  const link = await prisma.financeShareLink.create({
    data: {
      categoryId: body.categoryId,
      active:     true,
    },
  });

  return NextResponse.json(link, { status: 201 });
}

// DELETE — revoga link ativo
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");

  if (!categoryId) {
    return NextResponse.json(
      { error: "categoryId é obrigatório." },
      { status: 400 },
    );
  }

  await prisma.financeShareLink.updateMany({
    where: { categoryId, active: true },
    data:  { active: false },
  });

  return NextResponse.json({ success: true });
}