"use client";

import { useState } from "react";
import { UNLOCK_STORAGE_KEY } from "@/lib/cookies";
import { haptic } from "@/lib/haptics";

const PIN_LENGTH = 4;

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;

export function PinScreen({ onUnlocked }: { onUnlocked: () => void }) {
  const [digits, setDigits] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(next: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ pin: next }),
      });
      if (response.ok) {
        try {
          localStorage.setItem(UNLOCK_STORAGE_KEY, "1");
        } catch {
          /* The cookie still keeps the sign-in. */
        }
        haptic("tick");
        onUnlocked();
        return;
      }
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Wrong passcode.");
      setShake(true);
      setDigits("");
      haptic("warn");
    } catch {
      setError("Need a connection the first time.");
      setDigits("");
    } finally {
      setBusy(false);
    }
  }

  function press(key: string) {
    if (busy) return;
    if (key === "del") {
      setDigits((current) => current.slice(0, -1));
      haptic("select");
      return;
    }
    if (!key || digits.length >= PIN_LENGTH) return;
    const next = digits + key;
    setDigits(next);
    haptic("select");
    if (next.length === PIN_LENGTH) void submit(next);
  }

  return (
    <div className="pin">
      <h1>Enter Passcode</h1>
      <div className={shake ? "pin-dots shake" : "pin-dots"} onAnimationEnd={() => setShake(false)}>
        {Array.from({ length: PIN_LENGTH }, (_, index) => (
          <span key={index} className={index < digits.length ? "pin-dot on" : "pin-dot"} />
        ))}
      </div>
      {error ? <p className="pin-error">{error}</p> : <p className="pin-error quiet"> </p>}
      <div className="pin-pad">
        {KEYS.map((key) =>
          key === "" ? (
            <span key="gap" />
          ) : (
            <button
              key={key}
              type="button"
              className="pin-key"
              data-testid={key === "del" ? "pin-delete" : `pin-${key}`}
              aria-label={key === "del" ? "Delete" : key}
              onClick={() => press(key)}
            >
              {key === "del" ? "⌫" : key}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
