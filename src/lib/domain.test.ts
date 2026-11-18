import { describe, expect, it } from "vitest";
import {
  addDays,
  arrangeWorkout,
  chartGeometry,
  formatDay,
  melbourneToday,
  parseWeightInput,
  previousWeight,
  stepWeight,
  weightSeries,
  type Day,
} from "@/lib/domain";
import { buildSeed } from "@/lib/mock-seed";

describe("melbourne dates", () => {
  it("uses AEDT in November", () => {
    expect(melbourneToday(new Date("2026-11-16T12:30:00Z"))).toBe("2026-11-16");
    expect(melbourneToday(new Date("2026-11-16T13:30:00Z"))).toBe("2026-11-17");
  });

  it("uses AEST in July", () => {
    expect(melbourneToday(new Date("2026-07-01T13:30:00Z"))).toBe("2026-07-01");
    expect(melbourneToday(new Date("2026-07-01T14:30:00Z"))).toBe("2026-07-02");
  });

  it("formats today, yesterday, and older days", () => {
    const today = "2026-11-17";
    expect(formatDay(today, today)).toBe("Today");
    expect(formatDay(addDays(today, -1), today)).toBe("Yesterday");
    expect(formatDay("2026-11-10", today)).toBe("Tue 10 Nov");
    expect(formatDay("2025-01-02", today)).toBe("Thu 2 Jan 2025");
  });
});

describe("weights", () => {
  it("parses blanks, decimals, and commas", () => {
    expect(parseWeightInput("")).toEqual({ ok: true, value: null });
    expect(parseWeightInput("32.5")).toEqual({ ok: true, value: 32.5 });
    expect(parseWeightInput("32.")).toEqual({ ok: true, value: 32 });
    expect(parseWeightInput("13,6")).toEqual({ ok: true, value: 13.6 });
    expect(parseWeightInput("abc").ok).toBe(false);
    expect(parseWeightInput(".").ok).toBe(false);
  });

  it("steps by 2.5 and clears at the bottom", () => {
    expect(stepWeight(null, 2.5)).toBe(2.5);
    expect(stepWeight(null, -2.5)).toBeNull();
    expect(stepWeight(32.5, 2.5)).toBe(35);
    expect(stepWeight(13.6, 2.5)).toBe(16.1);
    expect(stepWeight(2.5, -2.5)).toBeNull();
  });
});

function entry(name: string, position: number): Day["entries"][number] {
  return {
    id: `e-${position}`,
    dayId: "day",
    exerciseId: null,
    name,
    weight: 20,
    sxr: "3 x 8-10",
    done: false,
    position,
    notes: null,
    createdAt: "2026-10-13T00:00:00.000Z",
    updatedAt: "2026-10-13T00:00:00.000Z",
  };
}

function day(focus: string, names: string[]): Day {
  return {
    id: "day",
    date: "2026-10-13",
    focus,
    notes: null,
    createdAt: "2026-10-13T00:00:00.000Z",
    updatedAt: "2026-10-13T00:00:00.000Z",
    entries: names.map(entry),
  };
}

describe("workout titles", () => {
  it("names a scrambled day after the main lift and puts that lift first", () => {
    const arranged = arrangeWorkout(
      day("Legs", [
        "Leg Curl",
        "Seated Row",
        "Machine Bicep Curl",
        "Pec fly",
        "Machine Shoulder Press",
        "DB Incline Chest Press",
      ]),
    );
    expect(arranged.focus).toBe("Chest");
    expect(arranged.entries.map((item) => item.name)).toEqual([
      "DB Incline Chest Press",
      "Leg Curl",
      "Seated Row",
      "Machine Bicep Curl",
      "Pec fly",
      "Machine Shoulder Press",
    ]);
    expect(arranged.entries.map((item) => item.position)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("keeps a shoulder day when the press is already first", () => {
    const original = day("Shoulder", [
      "DB Shoulder Press",
      "DB Incline Chest Press",
      "Seated Row",
    ]);
    expect(arrangeWorkout(original)).toBe(original);
  });

  it("titles a bent-over row day as back", () => {
    const arranged = arrangeWorkout(
      day("Legs", ["Leg Curl", "Lat Pulldown", "Bent-Over Row"]),
    );
    expect(arranged.focus).toBe("Back");
    expect(arranged.entries[0].name).toBe("Bent-Over Row");
  });

  it("leaves a day with no main lift unchanged", () => {
    const original = day("Arms", ["DB Curl", "DB Hammer Curl"]);
    expect(arrangeWorkout(original)).toBe(original);
  });
});

describe("history", () => {
  const today = "2026-11-17";
  const seed = buildSeed(today);

  it("finds the previous weight, not today's", () => {
    const current = seed.days.find((day) => day.id === "day-today")!;
    const press = seed.exercises.find((exercise) => exercise.name === "DB Shoulder Press")!;
    const entry = current.entries.find((item) => item.exerciseId === press.id)!;
    expect(previousWeight(seed.days, press.id, current, entry.position)).toEqual({
      weight: 27.5,
      date: addDays(today, -10),
    });
  });

  it("builds an ascending series and a finite chart", () => {
    const press = seed.exercises.find((exercise) => exercise.name === "DB Shoulder Press")!;
    const series = weightSeries(seed.days, press.id);
    expect(series.map((point) => point.weight)).toEqual([22.5, 25, 27.5, 30]);
    const chart = chartGeometry(series, 320, 160);
    expect(chart?.coords.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))).toBe(
      true,
    );
    expect(chartGeometry([], 320, 160)).toBeNull();
  });
});
