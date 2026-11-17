"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type UIEvent } from "react";
import { RepeatIcon } from "@/components/icons";
import { useGym } from "@/components/providers";
import { FOCUSES, formatDay, melbourneToday, progressOf, sortDays, todayDay } from "@/lib/domain";
import { haptic } from "@/lib/haptics";

export function HomeScreen() {
  const gym = useGym();
  const router = useRouter();
  const [focus, setFocus] = useState<string>("All");
  const today = melbourneToday();
  const hero = todayDay(gym.days, today);
  const showHero = Boolean(hero && (focus === "All" || hero.focus === focus));
  const rows = sortDays(gym.days).filter((day) => {
    if (showHero && hero && day.id === hero.id) return false;
    if (focus !== "All" && day.focus !== focus) return false;
    return true;
  });

  function onScroll(event: UIEvent<HTMLElement>) {
    const amount = Math.max(0, Math.min(1, event.currentTarget.scrollTop / 36));
    event.currentTarget.parentElement?.style.setProperty("--collapse", String(amount));
  }

  function repeat(id: string) {
    const day = gym.api.repeatDay(id);
    if (!day) return;
    haptic("select");
    router.push(`/day/${day.id}`);
  }

  return (
    <div className="screen">
      <header className="nav">
        <span className="nav-btn" />
        <div className="nav-title">Workouts</div>
        <span className="nav-btn" />
      </header>
      <div className="scroller" onScroll={onScroll}>
        <h1 className="large-title">Workouts</h1>
        {gym.sync === "saving" ? <p className="sync">Saving…</p> : null}
        {gym.sync === "offline" && gym.pending > 0 ? (
          <p className="sync">On this phone · will sync</p>
        ) : null}
        {gym.sync === "error" ? (
          <button type="button" className="sync warn" onClick={() => void gym.api.flush()}>
            Saved on this phone · Retry
          </button>
        ) : null}
        <div className="chips" role="tablist" aria-label="Focus">
          {["All", ...FOCUSES].map((name) => (
            <button
              key={name}
              type="button"
              className="chip"
              aria-pressed={focus === name}
              onClick={() => setFocus(name)}
            >
              {name}
            </button>
          ))}
        </div>
        {gym.status === "loading" && gym.days.length === 0 ? (
          <div className="boot">
            <div className="spinner" />
          </div>
        ) : null}
        {gym.status === "error" && gym.days.length === 0 ? (
          <div className="empty-copy">
            <p>{gym.error}</p>
            <button type="button" className="primary" onClick={() => void gym.api.load()}>
              Try again
            </button>
          </div>
        ) : null}
        {showHero && hero ? (
          <Link href={`/day/${hero.id}`} className="today" data-focus={hero.focus ?? ""}>
            <div className="kicker">Today</div>
            <div className="today-focus">
              <span className="dot" data-focus={hero.focus ?? ""} />
              {hero.focus ?? "Workout"}
            </div>
            <div className="today-date">{formatProgress(hero)}</div>
            <ProgressRing done={progressOf(hero).done} total={progressOf(hero).total} />
          </Link>
        ) : focus === "All" && gym.status === "ready" ? (
          <div className="empty-today">
            <strong>Nothing logged today</strong>
            <p>Repeat a past session. It copies the weights, unticked, onto today.</p>
          </div>
        ) : null}
        <div className="group">
          {rows.map((day) => {
            const progress = progressOf(day);
            const complete = progress.total > 0 && progress.done === progress.total;
            return (
              <div
                key={day.id}
                className="day-row"
                role="link"
                tabIndex={0}
                onClick={() => router.push(`/day/${day.id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") router.push(`/day/${day.id}`);
                }}
              >
                <div className="day-focus">
                  <span className="dot" data-focus={day.focus ?? ""} />
                  {day.focus ?? "Workout"}
                </div>
                <div className={`day-progress${complete ? " complete" : ""}`}>
                  {progress.done}/{progress.total}
                </div>
                <div className="day-date">{formatDay(day.date, today)}</div>
                <button
                  type="button"
                  className="repeat"
                  aria-label={`Repeat ${day.focus ?? "workout"} from ${formatDay(day.date, today)}`}
                  data-testid="repeat"
                  onClick={(event) => {
                    event.stopPropagation();
                    repeat(day.id);
                  }}
                >
                  <RepeatIcon />
                </button>
              </div>
            );
          })}
        </div>
        {gym.status === "ready" && rows.length === 0 && !showHero ? (
          <p className="empty-copy">No sessions for {focus}.</p>
        ) : null}
      </div>
    </div>
  );
}

function formatProgress(day: { entries: { done: boolean }[] }) {
  const progress = progressOf(day as Parameters<typeof progressOf>[0]);
  if (progress.total === 0) return "No exercises";
  if (progress.done === progress.total) return "Done";
  return `${progress.done} of ${progress.total}`;
}

function ProgressRing({ done, total }: { done: number; total: number }) {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const ratio = total === 0 ? 0 : done / total;
  return (
    <svg className="progress-ring" viewBox="0 0 64 64" aria-hidden="true">
      <circle className="track" cx="32" cy="32" r={radius} />
      <circle
        className="value"
        cx="32"
        cy="32"
        r={radius}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - ratio)}
      />
      <text x="32" y="36" textAnchor="middle">
        {done}/{total}
      </text>
    </svg>
  );
}
