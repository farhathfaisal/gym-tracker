import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  createSessionToken,
  SESSION_COOKIE,
  sessionCookie,
  sessionTokenValid,
  unlockCookie,
} from "@/lib/session";

export async function hasSession(): Promise<boolean> {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) return false;
  const jar = await cookies();
  return sessionTokenValid(jar.get(SESSION_COOKIE)?.value);
}

function secureFrom(request: Request): boolean {
  return new URL(request.url).protocol === "https:";
}

export async function refreshSession(request: Request, response: NextResponse): Promise<NextResponse> {
  if (!(await hasSession())) return response;
  const secure = secureFrom(request);
  response.cookies.set(sessionCookie(await createSessionToken(), secure));
  response.cookies.set(unlockCookie(secure));
  return response;
}

export async function requireSession(request: Request): Promise<NextResponse | null> {
  if (await hasSession()) return null;
  const secure = secureFrom(request);
  const response = NextResponse.json({ error: "locked" }, { status: 401 });
  response.cookies.set({ ...sessionCookie("", secure), maxAge: 0 });
  response.cookies.set({ ...unlockCookie(secure), value: "", maxAge: 0 });
  return response;
}
