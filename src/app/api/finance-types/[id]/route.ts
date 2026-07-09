// src/app/api/finance-types/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ---------- GET ----------
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const type = await prisma.financeType.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!type) {
    return NextResponse.json({ error: "Tipo não encontrado." }, { status: 404 });
  }

  return NextResponse.json(type);
}

// ---------- PUT (editar nome) ----------
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body   = await req.json();

  if (!body.name?.trim()) {
    return NextResponse.json(
      { error: "Nome é obrigatório." },
      { status: 400 },
    );
  }

  // verifica duplicata (ignora o próprio registro)
  const exists = await prisma.financeType.findFirst({
    where: {
      name:       body.name.trim(),
      kind:       body.kind,
      categoryId: body.categoryId,
      NOT:        { id },
    },
  });

  if (exists) {
    return NextResponse.json(
      { error: "Já existe um tipo com esse nome." },
      { status: 409 },
    );
  }

  const updated = await prisma.financeType.update({
    where: { id },
    data: {
      name:   body.name.trim(),
      kind:   body.kind,
      active: body.active ?? true,
    },
    include: { category: true },
  });

  return NextResponse.json(updated);
}

// ---------- PATCH (desativar / reativar) ----------
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id }   = await params;
  const body     = await req.json();
  const active   = typeof body.active === "boolean" ? body.active : false;

  const updated = await prisma.financeType.update({
    where: { id },
    data:  { active },
    include: { category: true },
  });

  return NextResponse.json(updated);
}

// ---------- DELETE (remove permanentemente) ----------
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // verifica se tem lançamentos vinculados
  const count = await prisma.financeEntry.count({
    where: { financeTypeId: id },
  });

  if (count > 0) {
    // não remove — só desativa para preservar histórico
    const deactivated = await prisma.financeType.update({
      where: { id },
      data:  { active: false },
      include: { category: true },
    });
    return NextResponse.json(
      { deactivated, message: "Tipo desativado pois possui lançamentos vinculados." },
      { status: 200 },
    );
  }

  await prisma.financeType.delete({ where: { id } });
  return NextResponse.json({ success: true });
}