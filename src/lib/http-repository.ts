import type { Snapshot } from "@/lib/domain";
import type { Op } from "@/lib/ops";
import type { GymRepository } from "@/lib/repository";
import { UNLOCK_COOKIE } from "@/lib/cookies";

function clearUnlockCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${UNLOCK_COOKIE}=; Max-Age=0; Path=/`;
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(path, { ...init, credentials: "same-origin" });
  } catch {
    throw new Error("network");
  }
  if (response.status === 401) {
    clearUnlockCookie();
    throw new Error("locked");
  }
  if (!response.ok) throw new Error("network");
  return response;
}

export function createHttpRepository(): GymRepository {
  return {
    async load(): Promise<Snapshot> {
      const response = await request("/api/data");
      return (await response.json()) as Snapshot;
    },
    async apply(op: Op): Promise<void> {
      await request("/api/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(op),
      });
    },
  };
}
