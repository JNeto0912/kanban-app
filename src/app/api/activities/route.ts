// src/app/api/activities/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const activities = await prisma.activity.findMany({
    include: { category: true },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(activities);
}

export async function POST(req: Request) {
  const body = await req.json();

  const activity = await prisma.activity.create({
    data: {
      title:       body.title,
      description: body.description ?? "",
      client:      body.client ?? "",
      status:      body.status ?? "Pendente",
      categoryId:  body.categoryId,
    },
    include: { category: true },
  });

  return NextResponse.json(activity, { status: 201 });
}