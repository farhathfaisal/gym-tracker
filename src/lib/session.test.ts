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
  it("accepts only the configured four digits", () => {
    process.env.APP_PIN = "1357";
    expect(pinMatches("1357")).toBe(true);
    expect(pinMatches("1358")).toBe(false);
    expect(pinMatches("135")).toBe(false);
    expect(pinMatches("13570")).toBe(false);
  });

  it("rejects every attempt when the pin is not configured", () => {
    delete process.env.APP_PIN;
    expect(pinMatches("1357")).toBe(false);
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
