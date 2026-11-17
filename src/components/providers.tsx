"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { createController, initialGymState, type GymController } from "@/lib/controller";
import { isOwnerEmail, melbourneToday } from "@/lib/domain";
import { createMockRepository } from "@/lib/mock-repository";
import { buildSeed } from "@/lib/mock-seed";
import type { GymRepository } from "@/lib/repository";
import { browserKv } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import { isMockMode, supabaseEnv } from "@/lib/supabase/env";
import { createSupabaseRepository } from "@/lib/supabase/repository";

type AuthStatus = "unknown" | "in" | "out";

type AuthValue = {
  status: AuthStatus;
  configured: boolean;
  mock: boolean;
  signOut: () => Promise<void>;
  markSignedIn: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);
const GymContext = createContext<GymController | null>(null);

let mockRepo: GymRepository | null = null;

function repository(): GymRepository {
  if (isMockMode()) {
    mockRepo ??= createMockRepository(buildSeed(melbourneToday()));
    return mockRepo;
  }
  return createSupabaseRepository(createClient());
}

const MOCK_KEY = "gym.mock.session";

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("Auth is unavailable");
  return value;
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
  const router = useRouter();
  const pathname = usePathname();
  const status = useSyncExternalStore(subscribeAuth, getAuthStatus, () => "unknown" as AuthStatus);
  const mock = isMockMode();
  const configured = mock || supabaseEnv() != null;

  useEffect(() => {
    if (mock) {
      const signedIn = window.localStorage.getItem(MOCK_KEY) === "1";
      setAuthStatus(signedIn ? "in" : "out");
      return;
    }
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      setAuthStatus("out");
      return;
    }
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const email = data.session?.user.email;
      if (data.session && isOwnerEmail(email)) setAuthStatus("in");
      else {
        if (data.session) void supabase.auth.signOut();
        setAuthStatus("out");
      }
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && isOwnerEmail(session.user.email)) setAuthStatus("in");
      else if (!session) setAuthStatus("out");
    });
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [mock]);

  useEffect(() => {
    if (status === "out" && pathname !== "/sign-in") router.replace("/sign-in");
    if (status === "in" && pathname === "/sign-in") router.replace("/");
  }, [status, pathname, router]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  const auth: AuthValue = {
    status,
    configured,
    mock,
    markSignedIn() {
      window.localStorage.setItem(MOCK_KEY, "1");
      setAuthStatus("in");
    },
    async signOut() {
      if (mock) {
        window.localStorage.removeItem(MOCK_KEY);
        setAuthStatus("out");
        return;
      }
      const supabase = createClient();
      await supabase.auth.signOut();
      setAuthStatus("out");
    },
  };

  return (
    <AuthContext.Provider value={auth}>
      <div className="app">
        <div className="frame">
          {status === "unknown" ? <Splash /> : null}
          {status === "out" && pathname !== "/sign-in" ? <Splash /> : null}
          {status === "in" ? <GymShell>{children}</GymShell> : null}
          {status === "out" && pathname === "/sign-in" ? children : null}
        </div>
      </div>
    </AuthContext.Provider>
  );
}

function GymShell({ children }: { children: ReactNode }) {
  const mock = isMockMode();
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

  return <GymContext.Provider value={controller}>{children}</GymContext.Provider>;
}

function Splash() {
  return (
    <div className="boot" aria-label="Loading">
      <div className="spinner" />
    </div>
  );
}

let authStatus: AuthStatus = "unknown";
const authListeners = new Set<() => void>();

function setAuthStatus(next: AuthStatus) {
  authStatus = next;
  for (const listener of authListeners) listener();
}

function getAuthStatus() {
  return authStatus;
}

function subscribeAuth(listener: () => void) {
  authListeners.add(listener);
  return () => authListeners.delete(listener);
}
