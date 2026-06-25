import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET() {
  const cats = await prisma.activityCategory.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(cats);
}

export async function POST(req: Request) {
  const { name } = await req.json();
  const id = slugify(name);

  const cat = await prisma.activityCategory.create({
    data: { id, name, custom: true },
  });

  return NextResponse.json(cat, { status: 201 });
}