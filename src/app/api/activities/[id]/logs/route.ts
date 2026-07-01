import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ id: string }>; // ← Promise no Next.js 15+
};

export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params; // ← await obrigatório

  try {
    const logs = await prisma.activityLog.findMany({
      where: { activityId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Erro ao buscar logs:", error);
    return NextResponse.json(
      { error: "Erro ao buscar logs da atividade" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params; // ← await obrigatório

  try {
    const body = await req.json();
    const note = String(body.note || "").trim();

    if (!note) {
      return NextResponse.json(
        { error: "A observação é obrigatória" },
        { status: 400 },
      );
    }

    const log = await prisma.activityLog.create({
      data: {
        activityId: id,
        note,
      },
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar log:", error);
    return NextResponse.json(
      { error: "Erro ao criar log da atividade" },
      { status: 500 },
    );
  }
}