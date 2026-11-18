"use client";

import { useState } from "react";
import { FOCUSES, type Exercise } from "@/lib/domain";

export function ExercisePicker({
  exercises,
  dayFocus,
  onChoose,
  onCreate,
}: {
  exercises: Exercise[];
  dayFocus: string | null;
  onChoose: (exercise: Exercise) => void;
  onCreate: (name: string, focus: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState(() =>
    dayFocus && (FOCUSES as readonly string[]).includes(dayFocus) ? dayFocus : "All",
  );
  const needle = query.trim().toLowerCase();
  const muscleOrder = [
    ...(dayFocus && (FOCUSES as readonly string[]).includes(dayFocus) ? [dayFocus] : []),
    ...FOCUSES.filter((name) => name !== dayFocus),
  ];
  const matches = [...exercises]
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
              (exercise) =>
                !exercise.focus || !(FOCUSES as readonly string[]).includes(exercise.focus),
            ),
          },
        ].filter((section) => section.exercises.length > 0)
      : [{ name: muscle, exercises: matches }];
  const exact = exercises.some((exercise) => exercise.name.toLowerCase() === needle);
  const createFocus = muscle === "All" ? dayFocus : muscle;

  return (
    <>
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
              <button
                key={exercise.id}
                type="button"
                className="option"
                onClick={() => onChoose(exercise)}
              >
                <span>{exercise.name}</span>
                {muscle === "All" && exercise.focus ? (
                  <span className="meta">{exercise.focus}</span>
                ) : null}
              </button>
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
        <button type="button" className="option create" onClick={() => onCreate(query.trim(), createFocus)}>
          Create “{query.trim()}”
        </button>
      ) : null}
    </>
  );
}
