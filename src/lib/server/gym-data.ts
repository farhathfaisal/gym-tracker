import { melbourneToday } from "@/lib/domain";
import { createMockRepository, type MockRepository } from "@/lib/mock-repository";
import { buildSeed } from "@/lib/mock-seed";
import type { GymRepository } from "@/lib/repository";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSupabaseRepository } from "@/lib/supabase/repository";

let mock: MockRepository | null = null;

export function gymRepository(): GymRepository {
  if (process.env.GYM_DATA === "mock") {
    mock ??= createMockRepository(buildSeed(melbourneToday()));
    return mock;
  }
  return createSupabaseRepository(createAdminClient());
}
