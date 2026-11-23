import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const version = process.env.VERSION?.trim() || "dev";
  return NextResponse.json({ version });
}
