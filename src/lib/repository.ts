import type { Snapshot } from "@/lib/domain";
import type { Op } from "@/lib/ops";

export interface GymRepository {
  load(): Promise<Snapshot>;
  apply(op: Op): Promise<void>;
}
