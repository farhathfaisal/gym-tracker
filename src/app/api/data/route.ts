import { NextResponse } from "next/server";
import { gymRepository } from "@/lib/server/gym-data";
import { refreshSession, requireSession } from "@/lib/server/guard";

export async function GET(request: Request) {
  const denied = await requireSession(request);
  if (denied) return denied;
  try {
    const snapshot = await gymRepository().load();
    return refreshSession(request, NextResponse.json(snapshot));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Couldn’t load workouts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
