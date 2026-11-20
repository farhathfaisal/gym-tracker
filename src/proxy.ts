import { NextResponse, type NextRequest } from "next/server";
import { createSessionToken, SESSION_COOKIE, sessionCookie, sessionTokenValid, unlockCookie } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token || !process.env.SESSION_SECRET) return response;
  if (!(await sessionTokenValid(token))) return response;
  const secure = request.nextUrl.protocol === "https:";
  response.cookies.set(sessionCookie(await createSessionToken(), secure));
  response.cookies.set(unlockCookie(secure));
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)",
  ],
};
