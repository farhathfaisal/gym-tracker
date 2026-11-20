import { NextResponse } from "next/server";
import type { Op } from "@/lib/ops";
import { gymRepository } from "@/lib/server/gym-data";
import { refreshSession, requireSession } from "@/lib/server/guard";

export async function POST(request: Request) {
  const denied = await requireSession(request);
  if (denied) return denied;
  let op: Op;
  try {
    op = (await request.json()) as Op;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (!op || typeof op !== "object" || !("kind" in op)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  try {
    await gymRepository().apply(op);
    return refreshSession(request, NextResponse.json({ ok: true }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Couldn’t save";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
