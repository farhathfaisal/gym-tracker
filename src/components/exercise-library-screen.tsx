"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, PlusIcon } from "@/components/icons";
import { Sheet } from "@/components/sheet";
import { useGym } from "@/components/providers";
import { FOCUSES, type Exercise } from "@/lib/domain";
import { haptic } from "@/lib/haptics";

export function ExerciseLibraryScreen({ embedded = false }: { embedded?: boolean }) {
  const gym = useGym();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState("All");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const needle = query.trim().toLowerCase();
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
          ...FOCUSES.map((name) => ({
            name,
            exercises: matches.filter((exercise) => exercise.focus === name),
          })),
          {
            name: "Other",
            exercises: matches.filter(
              (exercise) =>
                !exercise.focus || !(FOCUSES as readonly string[]).includes(exercise.focus),
            ),
          },
        ].filter((section) => section.exercises.length > 0)
      : [{ name: muscle, exercises: matches }];
  const editing = gym.exercises.find((exercise) => exercise.id === editingId) ?? null;

  return (
    <div className="screen">
      <header className="nav">
        {embedded ? (
          <span className="nav-btn" />
        ) : (
          <button type="button" className="nav-btn" onClick={() => router.push("/")}>
            <ChevronLeft />
            <strong>Workouts</strong>
          </button>
        )}
        <div className="nav-title">Exercises</div>
        <span className="nav-btn" />
      </header>
      <div className="scroller with-fab">
        <h1 className="large-title">Exercises</h1>
        <p className="progress-line">Names and muscle groups used across your workouts.</p>
        <div className="picker-tools library-tools">
          <input
            className="search"
            placeholder="Search exercises"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="chips muscle-chips" role="tablist" aria-label="Muscle group">
            {["All", ...FOCUSES].map((name) => (
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
            <div className="group library-group">
              {section.exercises.map((exercise) => (
                <button
                  key={exercise.id}
                  type="button"
                  className="library-row"
                  onClick={() => setEditingId(exercise.id)}
                >
                  <span className="dot" data-focus={exercise.focus ?? ""} />
                  <span className="manage-copy">
                    <span className="manage-name">{exercise.name}</span>
                    <span className="manage-meta">{usageLabel(gym.days, exercise.id)}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
        {matches.length === 0 ? <p className="empty-copy">No exercises in this group.</p> : null}
      </div>
      <button
        type="button"
        className="fab"
        aria-label="New exercise"
        onClick={() => setCreating(true)}
      >
        <PlusIcon />
      </button>
      <Sheet open={editing != null} title={editing?.name ?? "Exercise"} onClose={() => setEditingId(null)}>
        {editing ? (
          <ExerciseDetails
            key={editing.id}
            exercise={editing}
            usage={usageLabel(gym.days, editing.id)}
            onName={(name) => gym.api.updateExercise(editing.id, { name })}
            onFocus={(focus) => {
              gym.api.updateExercise(editing.id, { focus });
              haptic("select");
            }}
          />
        ) : null}
      </Sheet>
      <Sheet open={creating} title="New exercise" onClose={() => setCreating(false)}>
        <NewExercise
          initialFocus={muscle === "All" ? "Chest" : muscle}
          onCreate={(name, focus) => {
            const created = gym.api.createExercise(name, focus);
            haptic("select");
            setCreating(false);
            if (created) setEditingId(created.id);
          }}
        />
      </Sheet>
    </div>
  );
}

function usageLabel(days: { entries: { exerciseId: string | null }[] }[], exerciseId: string) {
  const count = days.filter((day) => day.entries.some((entry) => entry.exerciseId === exerciseId)).length;
  if (count === 0) return "Not used yet";
  if (count === 1) return "1 workout";
  return `${count} workouts`;
}

function ExerciseDetails({
  exercise,
  usage,
  onName,
  onFocus,
}: {
  exercise: Exercise;
  usage: string;
  onName: (name: string) => void;
  onFocus: (focus: string) => void;
}) {
  const [name, setName] = useState(exercise.name);
  return (
    <>
      <div className="field">
        <label htmlFor="library-name">Name</label>
        <input
          id="library-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => onName(name)}
        />
      </div>
      <p className="inset-label">Muscle group</p>
      <div className="focus-grid">
        {FOCUSES.map((focus) => (
          <button
            key={focus}
            type="button"
            className="chip"
            aria-pressed={exercise.focus === focus}
            onClick={() => onFocus(focus)}
          >
            <span className="dot" data-focus={focus} />
            {focus}
          </button>
        ))}
      </div>
      <p className="empty-copy">{usage}. A change here shows up in every workout that uses it.</p>
    </>
  );
}

function NewExercise({
  initialFocus,
  onCreate,
}: {
  initialFocus: string;
  onCreate: (name: string, focus: string) => void;
}) {
  const [name, setName] = useState("");
  const [focus, setFocus] = useState(initialFocus);
  return (
    <>
      <div className="field">
        <label htmlFor="new-exercise-name">Name</label>
        <input
          id="new-exercise-name"
          value={name}
          autoFocus
          placeholder="DB Shoulder Press"
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <p className="inset-label">Muscle group</p>
      <div className="focus-grid">
        {FOCUSES.map((item) => (
          <button
            key={item}
            type="button"
            className="chip"
            aria-pressed={focus === item}
            onClick={() => setFocus(item)}
          >
            <span className="dot" data-focus={item} />
            {item}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="account"
        disabled={!name.trim()}
        onClick={() => onCreate(name.trim(), focus)}
      >
        Save exercise
      </button>
    </>
  );
}
