"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/providers";
import { OWNER_EMAIL } from "@/lib/domain";
import { createClient } from "@/lib/supabase/client";
import { isMockMode } from "@/lib/supabase/env";

export function SignInScreen() {
  const auth = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const mock = isMockMode();
  const [stage, setStage] = useState<"email" | "code">("email");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const linkFailed = params.get("error") === "link";

  async function sendCode(kind: "code" | "link") {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mock) {
        setStage("code");
        setInfo(
          kind === "link"
            ? "Preview mode sends both. Enter any 6-digit code to continue."
            : null,
        );
        return;
      }
      const supabase = createClient();
      const { error: sendError } = await supabase.auth.signInWithOtp({
        email: OWNER_EMAIL,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });
      if (sendError) {
        const rateLimited = /rate limit/i.test(sendError.message);
        setError(
          rateLimited
            ? "No more emails can be sent for about an hour. If you already have a code, enter it below."
            : sendError.message,
        );
        if (rateLimited) setStage("code");
        return;
      }
      setStage("code");
      setInfo(
        kind === "link"
          ? "The link opens in Safari. Type the 6-digit code here so this home-screen app stays signed in."
          : "Enter the 6-digit code from the email. The link opens Safari, not this app.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function verify(nextCode: string) {
    if (!/^\d{6}$/.test(nextCode)) return;
    setBusy(true);
    setError(null);
    try {
      if (mock) {
        auth.markSignedIn();
        router.replace("/");
        return;
      }
      const supabase = createClient();
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: OWNER_EMAIL,
        token: nextCode,
        type: "email",
      });
      if (verifyError) {
        setError(verifyError.message);
        return;
      }
      if (!data.user || data.user.email?.toLowerCase() !== OWNER_EMAIL) {
        await supabase.auth.signOut();
        setError("This log is only for Farhath.");
        return;
      }
      router.replace("/");
    } finally {
      setBusy(false);
    }
  }

  if (!auth.configured) {
    return (
      <div className="sign-in">
        <h1>Gym</h1>
        <p className="lede">Supabase isn’t configured. Add the environment variables and reload.</p>
      </div>
    );
  }

  return (
    <div className="sign-in">
      <h1>Gym</h1>
      {stage === "email" ? (
        <>
          <p className="lede">A code, not a password. We’ll email a 6-digit code.</p>
          {linkFailed ? (
            <div className="link-error">That link didn’t work. Request a new code and type it here.</div>
          ) : null}
          <div className="email-lock">
            <span>Email</span>
            {OWNER_EMAIL}
          </div>
          <button
            type="button"
            className="primary"
            data-testid="send-code"
            disabled={busy}
            onClick={() => void sendCode("code")}
          >
            {busy ? "Sending…" : "Send code"}
          </button>
          <button
            type="button"
            className="text-btn"
            disabled={busy}
            onClick={() => void sendCode("link")}
          >
            Email a magic link instead
          </button>
          {error ? <p className="error-text">{error}</p> : null}
          <p className="fine">
            Open the home-screen app, then type the code. A link in the email signs Safari in, not
            the app on your Home Screen.
          </p>
        </>
      ) : (
        <>
          <p className="lede">Enter the code sent to {OWNER_EMAIL}.</p>
          {info ? <p className="fine" style={{ marginTop: 0, marginBottom: 16 }}>{info}</p> : null}
          <div className="otp">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className={code.length === index ? "otp-box on" : "otp-box"}>
                {code[index] ?? ""}
              </div>
            ))}
            <input
              data-testid="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              aria-label="6-digit code"
              value={code}
              onChange={(event) => {
                const next = event.target.value.replace(/\D/g, "").slice(0, 6);
                setCode(next);
                if (next.length === 6) void verify(next);
              }}
            />
          </div>
          {error ? <p className="error-text">{error}</p> : null}
          <button type="button" className="text-btn" disabled={busy} onClick={() => void sendCode("code")}>
            Resend code
          </button>
          <button
            type="button"
            className="text-btn"
            onClick={() => {
              setStage("email");
              setCode("");
              setError(null);
            }}
          >
            Back
          </button>
        </>
      )}
    </div>
  );
}
