"use client";

import { Reorder, useDragControls } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ExercisePicker } from "@/components/exercise-picker";
import { GripIcon, ChevronLeft } from "@/components/icons";
import { Sheet } from "@/components/sheet";
import { useGym } from "@/components/providers";
import {
  COMMON_SXR,
  displaySxr,
  FOCUSES,
  formatLongDate,
  formatWeight,
  parseWeightInput,
  sortEntries,
  stepWeight,
  type Exercise,
} from "@/lib/domain";
import { haptic } from "@/lib/haptics";
import type { GymController } from "@/lib/controller";
import type { Day, Entry } from "@/lib/domain";

export function WorkoutEditScreen({ id }: { id: string }) {
  const gym = useGym();
  const router = useRouter();
  const day = gym.days.find((item) => item.id === id);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [replacing, setReplacing] = useState(false);
  const storedIds = day ? sortEntries(day.entries).map((entry) => entry.id) : [];
  const storedKey = storedIds.join("|");
  const [override, setOverride] = useState<string[] | null>(null);
  const order = override ?? storedIds;
  const orderRef = useRef(storedIds);
  useEffect(() => {
    if (!override) orderRef.current = storedKey ? storedKey.split("|") : [];
  }, [override, storedKey]);

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

  const editing = day.entries.find((entry) => entry.id === editingId) ?? null;
  const editingExercise = editing?.exerciseId
    ? gym.exercises.find((exercise) => exercise.id === editing.exerciseId) ?? null
    : null;

  function finishDrag() {
    gym.api.reorder(day!.id, orderRef.current);
    setOverride(null);
  }

  function addExercise(exercise: Exercise) {
    gym.api.addEntry(day!.id, exercise);
    haptic("select");
    setAdding(false);
  }

  return (
    <div className="screen">
      <header className="nav">
        <button type="button" className="nav-btn" onClick={() => router.push(`/day/${day.id}`)}>
          <ChevronLeft />
          <strong>{day.focus ?? "Workout"}</strong>
        </button>
        <div className="nav-title">Exercises</div>
        <button type="button" className="nav-btn" onClick={() => router.push(`/day/${day.id}`)}>
          Done
        </button>
      </header>
      <div className="scroller with-bar">
        <h1 className="large-title">Exercises</h1>
        <p className="progress-line">
          {day.focus ?? "Workout"} · {formatLongDate(day.date)}
        </p>
        {day.entries.length === 0 ? (
          <p className="empty-copy">Add the exercises for this workout.</p>
        ) : (
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
              const exercise = entry.exerciseId
                ? gym.exercises.find((item) => item.id === entry.exerciseId)
                : null;
              return (
                <ManageRow
                  key={entry.id}
                  entry={entry}
                  focus={exercise?.focus ?? null}
                  onOpen={() => setEditingId(entry.id)}
                  onRemove={() => {
                    gym.api.deleteEntry(entry.id);
                    haptic("warn");
                    if (editingId === entry.id) setEditingId(null);
                  }}
                  onDragEnd={finishDrag}
                />
              );
            })}
          </Reorder.Group>
        )}
      </div>
      <div className="bottom-bar">
        <button type="button" className="add-btn" onClick={() => setAdding(true)}>
          Add exercise
        </button>
      </div>

      <Sheet open={adding} title="Add exercise" onClose={() => setAdding(false)}>
        <ExercisePicker
          exercises={gym.exercises}
          dayFocus={day.focus}
          onChoose={addExercise}
          onCreate={(name, focus) => {
            gym.api.createExerciseAndAdd(day.id, name, focus);
            haptic("select");
            setAdding(false);
          }}
        />
      </Sheet>

      <Sheet
        open={editing != null && !replacing}
        title={editing?.name ?? "Exercise"}
        onClose={() => setEditingId(null)}
      >
        {editing ? (
          <EntryEditor
            key={`${editing.id}:${editing.exerciseId ?? ""}`}
            entry={editing}
            exercise={editingExercise}
            api={gym.api}
            onReplace={() => setReplacing(true)}
            onRemove={() => {
              gym.api.deleteEntry(editing.id);
              haptic("warn");
              setEditingId(null);
            }}
          />
        ) : null}
      </Sheet>

      <Sheet open={replacing} title="Replace exercise" onClose={() => setReplacing(false)}>
        <ExercisePicker
          exercises={gym.exercises}
          dayFocus={day.focus}
          onChoose={(exercise) => {
            if (!editing) return;
            gym.api.replaceEntry(editing.id, exercise);
            haptic("select");
            setReplacing(false);
          }}
          onCreate={(name, focus) => {
            if (!editing) return;
            const created = gym.api.createExercise(name, focus);
            if (created) gym.api.replaceEntry(editing.id, created);
            haptic("select");
            setReplacing(false);
          }}
        />
      </Sheet>
    </div>
  );
}

function ManageRow({
  entry,
  focus,
  onOpen,
  onRemove,
  onDragEnd,
}: {
  entry: Entry;
  focus: string | null;
  onOpen: () => void;
  onRemove: () => void;
  onDragEnd: () => void;
}) {
  const controls = useDragControls();
  const weight = entry.weight == null ? "No weight" : `${formatWeight(entry.weight)} kg`;
  return (
    <Reorder.Item
      as="div"
      value={entry.id}
      dragListener={false}
      dragControls={controls}
      className="manage-item"
      onDragEnd={onDragEnd}
    >
      <button
        type="button"
        className="remove-btn"
        aria-label={`Remove ${entry.name}`}
        onClick={onRemove}
      >
        <span />
      </button>
      <button type="button" className="manage-main" onClick={onOpen}>
        <span className="dot" data-focus={focus ?? ""} />
        <span className="manage-copy">
          <span className="manage-name">{entry.name}</span>
          <span className="manage-meta">
            {focus ? `${focus} · ` : ""}
            {displaySxr(entry.sxr)} · {weight}
          </span>
        </span>
      </button>
      <button
        type="button"
        className="handle"
        aria-label={`Reorder ${entry.name}`}
        onPointerDown={(event) => {
          event.stopPropagation();
          controls.start(event);
        }}
      >
        <GripIcon />
      </button>
    </Reorder.Item>
  );
}

function EntryEditor({
  entry,
  exercise,
  api,
  onReplace,
  onRemove,
}: {
  entry: Entry;
  exercise: Exercise | null;
  api: GymController;
  onReplace: () => void;
  onRemove: () => void;
}) {
  const [name, setName] = useState(entry.name);
  const [note, setNote] = useState(entry.notes ?? "");
  const [weight, setWeight] = useState(formatWeight(entry.weight));
  const [customSxr, setCustomSxr] = useState("");

  function commitName() {
    if (!exercise) return;
    api.updateExercise(exercise.id, { name });
  }

  function commitWeight(raw: string) {
    const parsed = parseWeightInput(raw);
    if (!parsed.ok) {
      setWeight(formatWeight(entry.weight));
      return;
    }
    api.setWeight(entry.id, parsed.value);
    setWeight(formatWeight(parsed.value));
  }

  return (
    <>
      <button type="button" className="account" onClick={onReplace}>
        Replace exercise
      </button>
      {exercise ? (
        <div className="field">
          <label htmlFor="exercise-name">Name</label>
          <input
            id="exercise-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={commitName}
          />
        </div>
      ) : (
        <p className="inset-label">{entry.name}</p>
      )}
      {exercise ? (
        <>
          <p className="inset-label">Muscle group</p>
          <div className="focus-grid">
            {FOCUSES.map((focus) => (
              <button
                key={focus}
                type="button"
                className="chip"
                aria-pressed={exercise.focus === focus}
                onClick={() => api.updateExercise(exercise.id, { focus })}
              >
                <span className="dot" data-focus={focus} />
                {focus}
              </button>
            ))}
          </div>
        </>
      ) : null}
      <div className="field">
        <label htmlFor="edit-weight">Weight</label>
        <div className="weight-row">
          <button
            type="button"
            className="step"
            aria-label="Decrease weight"
            onClick={() => {
              const next = stepWeight(entry.weight, -2.5);
              api.setWeight(entry.id, next);
              setWeight(formatWeight(next));
            }}
          >
            −
          </button>
          <input
            id="edit-weight"
            className="weight"
            inputMode="decimal"
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            onBlur={() => commitWeight(weight)}
          />
          <span className="unit">kg</span>
          <button
            type="button"
            className="step"
            aria-label="Increase weight"
            onClick={() => {
              const next = stepWeight(entry.weight, 2.5);
              api.setWeight(entry.id, next);
              setWeight(formatWeight(next));
            }}
          >
            +
          </button>
        </div>
      </div>
      <p className="inset-label">Sets × reps</p>
      <div>
        {COMMON_SXR.map((value) => (
          <button
            key={value}
            type="button"
            className="option"
            onClick={() => {
              api.setSxr(entry.id, value);
              haptic("select");
            }}
          >
            <span>{displaySxr(value)}</span>
            {entry.sxr === value ? <span className="check-mark">✓</span> : null}
          </button>
        ))}
      </div>
      <div className="field" style={{ marginTop: 12 }}>
        <label htmlFor="edit-sxr">Custom sets × reps</label>
        <input
          id="edit-sxr"
          value={customSxr}
          placeholder="3 x 8-10"
          onChange={(event) => setCustomSxr(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && customSxr.trim()) {
              api.setSxr(entry.id, customSxr.trim());
              setCustomSxr("");
            }
          }}
        />
      </div>
      <div className="field">
        <label htmlFor="edit-note">Note</label>
        <input
          id="edit-note"
          value={note}
          placeholder="Per arm"
          onChange={(event) => setNote(event.target.value)}
          onBlur={() => api.setNote(entry.id, note)}
        />
      </div>
      <button type="button" className="account danger" onClick={onRemove}>
        Remove from workout
      </button>
    </>
  );
}
