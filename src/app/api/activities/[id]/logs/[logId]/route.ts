import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ id: string; logId: string }>; // ← Promise no Next.js 15+
};

export async function DELETE(_: NextRequest, { params }: Params) {
  const { logId } = await params; // ← await obrigatório

  try {
    await prisma.activityLog.delete({
      where: { id: logId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao excluir log:", error);
    return NextResponse.json(
      { error: "Erro ao excluir log" },
      { status: 500 },
    );
  }
}