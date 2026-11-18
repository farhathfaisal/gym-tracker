"use client";

import { Reorder } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type UIEvent } from "react";
import { WeightChart } from "@/components/chart";
import { ExerciseRow } from "@/components/exercise-row";
import { ChevronDown, ChevronLeft } from "@/components/icons";
import { Sheet } from "@/components/sheet";
import { useGym } from "@/components/providers";
import {
  COMMON_SXR,
  displaySxr,
  FOCUSES,
  formatDay,
  formatLongDate,
  melbourneToday,
  progressOf,
  sortEntries,
  weightSeries,
  type Exercise,
} from "@/lib/domain";
import { haptic } from "@/lib/haptics";

export function DayScreen({ id }: { id: string }) {
  const gym = useGym();
  const router = useRouter();
  const day = gym.days.find((item) => item.id === id);
  const today = melbourneToday();
  const [settings, setSettings] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<string>("All");
  const [sxrEntry, setSxrEntry] = useState<string | null>(null);
  const [customSxr, setCustomSxr] = useState("");
  const [historyId, setHistoryId] = useState<string | null>(null);
  const storedIds = day ? sortEntries(day.entries).map((entry) => entry.id) : [];
  const storedKey = storedIds.join("|");
  const [override, setOverride] = useState<string[] | null>(null);
  const order = override ?? storedIds;
  const orderRef = useRef(storedIds);
  useEffect(() => {
    if (!override) orderRef.current = storedKey ? storedKey.split("|") : [];
  }, [override, storedKey]);

  function onScroll(event: UIEvent<HTMLElement>) {
    const amount = Math.max(0, Math.min(1, event.currentTarget.scrollTop / 36));
    event.currentTarget.parentElement?.style.setProperty("--collapse", String(amount));
  }

  if (gym.status === "loading" && !day) {
    return (
      <div className="screen">
        <div className="boot">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (!day) {
    return (
      <div className="screen">
        <header className="nav">
          <button type="button" className="nav-btn" onClick={() => router.push("/")}>
            <ChevronLeft />
            Workouts
          </button>
        </header>
        <p className="empty-copy">This workout isn’t on this phone.</p>
      </div>
    );
  }

  const progress = progressOf(day);
  const sxrTarget = day.entries.find((entry) => entry.id === sxrEntry) ?? null;
  const historyEntry = day.entries.find((entry) => entry.id === historyId) ?? null;
  const history = historyEntry?.exerciseId
    ? weightSeries(gym.days, historyEntry.exerciseId)
    : [];
  const focusName = day.focus ?? "Workout";

  function finishDrag() {
    gym.api.reorder(day!.id, orderRef.current);
    setOverride(null);
  }

  function openAdd() {
    const focus = day?.focus;
    setMuscle(focus && (FOCUSES as readonly string[]).includes(focus) ? focus : "All");
    setQuery("");
    setAdding(true);
  }

  function closeAdd() {
    setAdding(false);
    setQuery("");
  }

  function chooseExercise(exercise: Exercise) {
    gym.api.addEntry(day!.id, exercise);
    haptic("select");
    closeAdd();
  }

  const needle = query.trim().toLowerCase();
  const muscleOrder = [
    ...(day.focus && (FOCUSES as readonly string[]).includes(day.focus) ? [day.focus] : []),
    ...FOCUSES.filter((name) => name !== day.focus),
  ];
  const matches = [...gym.exercises]
    .filter((exercise) => {
      if (needle && !exercise.name.toLowerCase().includes(needle)) return false;
      if (muscle !== "All" && exercise.focus !== muscle) return false;
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  const sections =
    muscle === "All"
      ? [
          ...muscleOrder.map((name) => ({
            name,
            exercises: matches.filter((exercise) => exercise.focus === name),
          })),
          {
            name: "Other",
            exercises: matches.filter(
              (exercise) => !exercise.focus || !(FOCUSES as readonly string[]).includes(exercise.focus),
            ),
          },
        ].filter((section) => section.exercises.length > 0)
      : [{ name: muscle, exercises: matches }];
  const exact = gym.exercises.some((exercise) => exercise.name.toLowerCase() === needle);

  return (
    <div className="screen">
      <header className="nav">
        <button type="button" className="nav-btn" onClick={() => router.push("/")}>
          <ChevronLeft />
          <strong>Workouts</strong>
        </button>
        <div className="nav-title">{focusName}</div>
        <button type="button" className="nav-btn" onClick={() => setSettings(true)}>
          Edit
        </button>
      </header>
      <div className="scroller with-bar" onScroll={onScroll}>
        <h1 className="large-title">{focusName}</h1>
        <button type="button" className="subtitle-btn" onClick={() => setSettings(true)}>
          {formatLongDate(day.date)}
          <ChevronDown />
        </button>
        <p className="progress-line">
          {progress.total === 0
            ? "No exercises yet"
            : progress.done === progress.total
              ? "All done"
              : `${progress.done} of ${progress.total}`}
        </p>
        <Reorder.Group
          as="div"
          axis="y"
          values={order}
          onReorder={(next) => {
            orderRef.current = next;
            setOverride(next);
          }}
          className="group"
        >
          {order.map((entryId) => {
            const entry = day.entries.find((item) => item.id === entryId);
            if (!entry) return null;
            return (
              <ExerciseRow
                key={entry.id}
                day={day}
                entry={entry}
                days={gym.days}
                api={gym.api}
                onSxr={() => {
                  setSxrEntry(entry.id);
                  setCustomSxr(entry.sxr ?? "");
                }}
                onHistory={() => setHistoryId(entry.id)}
                onDragStart={() => undefined}
                onDragEnd={finishDrag}
              />
            );
          })}
        </Reorder.Group>
        {day.entries.length === 0 ? (
          <p className="empty-copy">Add the first exercise for this session.</p>
        ) : null}
      </div>
      <div className="bottom-bar">
        <button
          type="button"
          className="add-btn"
          data-testid="add-exercise"
          onClick={openAdd}
        >
          Add exercise
        </button>
      </div>

      <Sheet
        open={settings}
        title="Session"
        onClose={() => {
          setSettings(false);
          setConfirmDelete(false);
        }}
      >
        <div className="field">
          <label htmlFor="session-date">Date</label>
          <input
            id="session-date"
            type="date"
            value={day.date}
            onChange={(event) => gym.api.updateDay(day.id, { date: event.target.value })}
          />
        </div>
        <p className="inset-label">Focus</p>
        <div className="focus-grid">
          {FOCUSES.map((name) => (
            <button
              key={name}
              type="button"
              className="chip"
              aria-pressed={day.focus === name}
              onClick={() => gym.api.updateDay(day.id, { focus: name })}
            >
              {name}
            </button>
          ))}
        </div>
        {confirmDelete ? (
          <>
            <p className="empty-copy">Delete this workout and its exercises?</p>
            <button
              type="button"
              className="account danger"
              onClick={() => {
                gym.api.deleteDay(day.id);
                router.push("/");
              }}
            >
              Delete workout
            </button>
            <button type="button" className="account" onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
          </>
        ) : (
          <button type="button" className="account danger" onClick={() => setConfirmDelete(true)}>
            Delete workout
          </button>
        )}
      </Sheet>

      <Sheet open={adding} title="Add exercise" onClose={closeAdd}>
        <div className="picker-tools">
          <input
            className="search"
            placeholder="Search or create"
            value={query}
            autoFocus
            data-testid="exercise-search"
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="chips muscle-chips" role="tablist" aria-label="Muscle group">
            {["All", ...muscleOrder].map((name) => (
              <button
                key={name}
                type="button"
                className="chip"
                aria-pressed={muscle === name}
                onClick={() => setMuscle(name)}
              >
                {name === "All" ? null : <span className="dot" data-focus={name} />}
                {name}
              </button>
            ))}
          </div>
        </div>
        {sections.map((section) => (
          <div key={section.name}>
            {muscle === "All" ? <p className="inset-label">{section.name}</p> : null}
            <div>
              {section.exercises.map((exercise) => (
                <ExerciseChoice
                  key={exercise.id}
                  exercise={exercise}
                  showFocus={muscle === "All"}
                  onChoose={chooseExercise}
                />
              ))}
            </div>
          </div>
        ))}
        {matches.length === 0 && !needle ? (
          <p className="empty-copy">
            {muscle === "All" ? "No exercises yet." : `No ${muscle.toLowerCase()} exercises yet.`}
          </p>
        ) : null}
        {needle && !exact ? (
          <button
            type="button"
            className="option create"
            onClick={() => {
              gym.api.createExerciseAndAdd(day.id, query, muscle === "All" ? day.focus : muscle);
              haptic("select");
              closeAdd();
            }}
          >
            Create “{query.trim()}”
          </button>
        ) : null}
      </Sheet>

      <Sheet
        open={sxrTarget != null}
        title="Sets × reps"
        onClose={() => setSxrEntry(null)}
      >
        <div>
          {COMMON_SXR.map((value) => (
            <button
              key={value}
              type="button"
              className="option"
              onClick={() => {
                if (!sxrTarget) return;
                gym.api.setSxr(sxrTarget.id, value);
                haptic("select");
                setSxrEntry(null);
              }}
            >
              <span>{displaySxr(value)}</span>
              {sxrTarget?.sxr === value ? <span className="check-mark">✓</span> : null}
            </button>
          ))}
        </div>
        <div className="field" style={{ marginTop: 16 }}>
          <label htmlFor="custom-sxr">Custom</label>
          <input
            id="custom-sxr"
            value={customSxr}
            placeholder="3 x 8-10"
            onChange={(event) => setCustomSxr(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && sxrTarget) {
                gym.api.setSxr(sxrTarget.id, customSxr.trim() || null);
                setSxrEntry(null);
              }
            }}
          />
        </div>
        <button
          type="button"
          className="account"
          onClick={() => {
            if (!sxrTarget) return;
            gym.api.setSxr(sxrTarget.id, customSxr.trim() || null);
            setSxrEntry(null);
          }}
        >
          Use custom
        </button>
      </Sheet>

      <Sheet
        open={historyEntry != null}
        title={historyEntry?.name ?? "History"}
        onClose={() => setHistoryId(null)}
      >
        <WeightChart points={history} today={today} />
        {history.length > 0 ? (
          <div>
            {[...history].reverse().slice(0, 12).map((point) => (
              <div key={point.date} className="history-row">
                <span>{formatDay(point.date, today)}</span>
                <span className="muted">
                  {point.weight} kg{point.sxr ? ` · ${displaySxr(point.sxr)}` : ""}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}

function ExerciseChoice({
  exercise,
  showFocus,
  onChoose,
}: {
  exercise: Exercise;
  showFocus: boolean;
  onChoose: (exercise: Exercise) => void;
}) {
  return (
    <button type="button" className="option" onClick={() => onChoose(exercise)}>
      <span>{exercise.name}</span>
      {showFocus && exercise.focus ? <span className="meta">{exercise.focus}</span> : null}
    </button>
  );
}
