import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ id: string }>;
};

// Função auxiliar: adiciona 1 mês à data, preservando o dia quando possível
function addOneMonth(date: Date) {
  const next = new Date(date);
  const day = next.getDate();

  // Vai para o primeiro dia do próximo mês
  next.setDate(1);
  next.setMonth(next.getMonth() + 1);

  // Ajusta o dia para o último dia do mês caso o mês seguinte seja mais curto
  const lastDay = new Date(
    next.getFullYear(),
    next.getMonth() + 1,
    0,
  ).getDate();

  next.setDate(Math.min(day, lastDay));
  return next;
}

// GET – obtém o lançamento
export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params;

  const entry = await prisma.financeEntry.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!entry) {
    return NextResponse.json(
      { error: "Lançamento não encontrado" },
      { status: 404 },
    );
  }

  return NextResponse.json(entry);
}

// PUT – atualiza o lançamento (inclui a geração automática)
export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();

  // Busca o registro atual para comparar o estado de pagamento
  const current = await prisma.financeEntry.findUnique({
    where: { id },
  });

  if (!current) {
    return NextResponse.json(
      { error: "Lançamento não encontrado" },
      { status: 404 },
    );
  }

  // Atualiza o registro com os dados recebidos
  const updated = await prisma.financeEntry.update({
    where: { id },
    data: {
      title: body.title ?? current.title,
      amount:
        body.amount !== undefined ? Number(body.amount) : current.amount,
      dueDate: body.dueDate ? new Date(body.dueDate) : current.dueDate,
      kind: body.kind ?? current.kind,
      categoryId: body.categoryId ?? current.categoryId,
      partner: body.partner ?? current.partner,
      notes: body.notes ?? current.notes,
      recurring:
        typeof body.recurring === "boolean"
          ? body.recurring
          : current.recurring,
      paid: typeof body.paid === "boolean" ? body.paid : current.paid,
      paidAt:
        body.paidAt !== undefined
          ? body.paidAt
            ? new Date(body.paidAt)
            : null
          : current.paidAt,
    },
  });

  // Detecta a transição de "não pago" → "pago"
  const becamePaid = !current.paid && updated.paid;

  // Se for recorrente e acabou de ser marcado como pago, cria o próximo lançamento
  if (current.recurring && becamePaid) {
    // Verifica se já existe um lançamento gerado a partir deste (evita duplicação)
    const alreadyGenerated = await prisma.financeEntry.findFirst({
      where: { generatedFromId: current.id },
    });

    if (!alreadyGenerated) {
      await prisma.financeEntry.create({
        data: {
          title: current.title,
          amount: current.amount,
          dueDate: addOneMonth(new Date(current.dueDate)),
          kind: current.kind,
          categoryId: current.categoryId,
          partner: current.partner,
          notes: current.notes,
          recurring: true,
          paid: false,
          paidAt: null,
          generatedFromId: current.id, // referência ao lançamento que gerou este
        },
      });
    }
  }

  return NextResponse.json(updated);
}

// DELETE – remove o lançamento
export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params;

  await prisma.financeEntry.delete({
    where: { id },
  });

  return NextResponse.json({ ok: true });
}