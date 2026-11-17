import { SESSION_COOKIE, SESSION_MAX_AGE, UNLOCK_COOKIE } from "@/lib/cookies";

export { SESSION_COOKIE, SESSION_MAX_AGE, UNLOCK_COOKIE };

type CookieOptions = {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
};

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("SESSION_SECRET is not configured");
  }
  return value;
}

function bytesToBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of view) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return bytesToBase64Url(signature);
}

function safeEqual(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  const length = Math.max(a.length, b.length);
  let diff = a.length === b.length ? 0 : 1;
  for (let index = 0; index < length; index += 1) {
    diff |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }
  return diff === 0;
}

export async function createSessionToken(now = Date.now()): Promise<string> {
  const payload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify({ v: 1, iat: now })));
  return `${payload}.${await hmac(payload)}`;
}

export async function sessionTokenValid(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const split = token.lastIndexOf(".");
  if (split <= 0) return false;
  const payload = token.slice(0, split);
  const signature = token.slice(split + 1);
  try {
    const expected = await hmac(payload);
    if (!safeEqual(signature, expected)) return false;
    const parsed = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload))) as { v?: number };
    return parsed.v === 1;
  } catch {
    return false;
  }
}

export function sessionCookie(token: string, secure: boolean): CookieOptions {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

export function unlockCookie(secure: boolean): CookieOptions {
  return {
    name: UNLOCK_COOKIE,
    value: "1",
    httpOnly: false,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

export function hasUnlockCookie(cookieHeader: string | null | undefined): boolean {
  if (!cookieHeader) return false;
  return cookieHeader.split(";").some((part) => part.trim() === `${UNLOCK_COOKIE}=1`);
}
