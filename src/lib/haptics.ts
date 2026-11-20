export function haptic(kind: "tick" | "select" | "warn") {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  const pattern = kind === "tick" ? 12 : kind === "warn" ? [10, 40, 10] : 6;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* Some browsers expose vibrate and then refuse the call. */
  }
}
