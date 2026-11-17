import { afterEach, describe, expect, it } from "vitest";
import { pinMatches } from "@/lib/pin";
import { createSessionToken, sessionTokenValid } from "@/lib/session";

const originalPin = process.env.APP_PIN;
const originalSecret = process.env.SESSION_SECRET;

afterEach(() => {
  process.env.APP_PIN = originalPin;
  process.env.SESSION_SECRET = originalSecret;
});

describe("pin", () => {
  it("accepts only the configured six digits", () => {
    process.env.APP_PIN = "135790";
    expect(pinMatches("135790")).toBe(true);
    expect(pinMatches("135791")).toBe(false);
    expect(pinMatches("13579")).toBe(false);
    expect(pinMatches("1357900")).toBe(false);
  });

  it("rejects every attempt when the pin is not configured", () => {
    delete process.env.APP_PIN;
    expect(pinMatches("135790")).toBe(false);
  });
});

describe("session", () => {
  it("round-trips a token and rejects tampering", async () => {
    process.env.SESSION_SECRET = "test-secret-that-is-long-enough-for-hmac";
    const token = await createSessionToken(1_700_000_000_000);
    expect(await sessionTokenValid(token)).toBe(true);
    expect(await sessionTokenValid(`${token}x`)).toBe(false);
    expect(await sessionTokenValid("")).toBe(false);
  });
});
