import { NextResponse } from "next/server";
import { pinConfigured, pinMatches } from "@/lib/pin";
import { createSessionToken, sessionCookie, unlockCookie } from "@/lib/session";

const failures = new Map<string, { count: number; until: number }>();

function clientKey(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export async function POST(request: Request) {
  if (!pinConfigured() || !process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    return NextResponse.json({ error: "Passcode isn’t configured yet." }, { status: 503 });
  }

  const key = clientKey(request);
  const prior = failures.get(key);
  if (prior && prior.until > Date.now()) {
    return NextResponse.json(
      { error: "Wait a moment, then try the passcode again." },
      { status: 429 },
    );
  }

  let pin = "";
  try {
    const body = (await request.json()) as { pin?: string };
    pin = body.pin ?? "";
  } catch {
    pin = "";
  }

  if (!pinMatches(pin)) {
    const count = (prior?.count ?? 0) + 1;
    const pause = count >= 5 ? 30_000 : 0;
    failures.set(key, { count, until: Date.now() + pause });
    return NextResponse.json({ error: "Wrong passcode." }, { status: 401 });
  }

  failures.delete(key);
  const response = NextResponse.json({ ok: true });
  const secure = new URL(request.url).protocol === "https:";
  response.cookies.set(sessionCookie(await createSessionToken(), secure));
  response.cookies.set(unlockCookie(secure));
  return response;
}
