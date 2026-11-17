"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { createController, initialGymState, type GymController } from "@/lib/controller";
import { melbourneToday } from "@/lib/domain";
import { createHttpRepository } from "@/lib/http-repository";
import { createMockRepository } from "@/lib/mock-repository";
import { buildSeed } from "@/lib/mock-seed";
import { PinScreen } from "@/components/pin-screen";
import type { GymRepository } from "@/lib/repository";
import { browserKv } from "@/lib/storage";
import { UNLOCK_COOKIE } from "@/lib/cookies";

const GymContext = createContext<GymController | null>(null);

let mockRepo: GymRepository | null = null;

function repository(): GymRepository {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
    mockRepo ??= createMockRepository(buildSeed(melbourneToday()));
    return mockRepo;
  }
  return createHttpRepository();
}

function readUnlocked(): boolean {
  return document.cookie.split(";").some((part) => part.trim() === `${UNLOCK_COOKIE}=1`);
}

function subscribeToNothing(): () => void {
  return () => undefined;
}

export function useGym() {
  const controller = useContext(GymContext);
  if (!controller) throw new Error("Workouts are still loading");
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    () => initialGymState,
  );
  return { ...state, api: controller };
}

export function Providers({ children }: { children: ReactNode }) {
  const client = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  const [unlocked, setUnlocked] = useState(false);
  const signedIn = client && (unlocked || readUnlocked());

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  return (
    <div className="app">
      <div className="frame">
        {!client ? <Splash /> : null}
        {client && signedIn ? <GymShell onLocked={() => setUnlocked(false)}>{children}</GymShell> : null}
        {client && !signedIn ? <PinScreen onUnlocked={() => setUnlocked(true)} /> : null}
      </div>
    </div>
  );
}

function GymShell({ children, onLocked }: { children: ReactNode; onLocked: () => void }) {
  const mock = process.env.NEXT_PUBLIC_USE_MOCK === "true";
  const [controller] = useState(() =>
    createController({
      repo: repository(),
      storage: browserKv(),
      storageKey: mock ? "gym.mock.v1" : "gym.v1",
      online: () => (typeof navigator === "undefined" ? true : navigator.onLine),
    }),
  );

  useEffect(() => {
    void controller.load();
    const sync = () => controller.refreshConnectivity();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [controller]);

  return (
    <GymContext.Provider value={controller}>
      <LockWatch onLocked={onLocked} />
      {children}
    </GymContext.Provider>
  );
}

function LockWatch({ onLocked }: { onLocked: () => void }) {
  const gym = useGym();
  useEffect(() => {
    if (gym.error === "locked") onLocked();
  }, [gym.error, onLocked]);
  return null;
}

function Splash() {
  return (
    <div className="boot" aria-label="Loading">
      <div className="spinner" />
    </div>
  );
}
