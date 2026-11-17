"use client";

import { Reorder, useDragControls } from "framer-motion";
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { CheckMark, GripIcon } from "@/components/icons";
import {
  displayNote,
  displaySxr,
  formatWeight,
  parseWeightInput,
  previousWeight,
  stepWeight,
  type Day,
  type Entry,
} from "@/lib/domain";
import { haptic } from "@/lib/haptics";
import type { GymController } from "@/lib/controller";

export function ExerciseRow({
  day,
  entry,
  days,
  api,
  onSxr,
  onHistory,
  onDragStart,
  onDragEnd,
}: {
  day: Day;
  entry: Entry;
  days: Day[];
  api: GymController;
  onSxr: () => void;
  onHistory: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const controls = useDragControls();
  const frontRef = useRef<HTMLDivElement>(null);
  const xRef = useRef(0);
  const openRef = useRef(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [pop, setPop] = useState(false);
  const previous = entry.exerciseId
    ? previousWeight(days, entry.exerciseId, day, entry.position)
    : null;
  const note = displayNote(entry.notes);
  const shown = draft ?? formatWeight(entry.weight);

  function setX(x: number, animate: boolean) {
    const node = frontRef.current;
    if (!node) return;
    node.style.transition = animate
      ? "transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)"
      : "none";
    node.style.transform = `translateX(${x}px)`;
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, input, a, [data-nodrag]")) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = openRef.current ? -88 : 0;
    xRef.current = origin;
    let locked: "x" | "y" | null = null;

    function move(ev: PointerEvent) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!locked) {
        if (Math.hypot(dx, dy) < 8) return;
        locked = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        if (locked === "y") {
          cleanup();
          return;
        }
      }
      const next = Math.min(0, Math.max(-120, origin + dx));
      xRef.current = next;
      setX(next, false);
    }

    function up() {
      if (locked === "x") {
        const x = xRef.current;
        if (x < -100) {
          setX(-140, true);
          haptic("warn");
          api.deleteEntry(entry.id);
        } else if (x < -48) {
          openRef.current = true;
          setX(-88, true);
        } else {
          openRef.current = false;
          setX(0, true);
        }
      }
      cleanup();
    }

    function cleanup() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  function bump(delta: number) {
    setDraft(null);
    api.setWeight(entry.id, stepWeight(entry.weight, delta));
    haptic("select");
  }

  const hint = hintText(entry, previous, day.date);

  return (
    <Reorder.Item
      as="div"
      value={entry.id}
      dragListener={false}
      dragControls={controls}
      className={entry.done ? "entry done" : "entry"}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <button
        type="button"
        className="entry-delete"
        aria-label={`Delete ${entry.name}`}
        onClick={() => {
          haptic("warn");
          api.deleteEntry(entry.id);
        }}
      >
        Delete
      </button>
      <div className="entry-front" ref={frontRef} onPointerDown={onPointerDown}>
        <button
          type="button"
          className="check-btn"
          aria-pressed={entry.done}
          aria-label={entry.done ? `Mark ${entry.name} not done` : `Mark ${entry.name} done`}
          data-testid="check"
          onClick={() => {
            const next = !entry.done;
            if (next) setPop(true);
            api.setDone(entry.id, next);
            haptic("tick");
          }}
        >
          <span
            className={pop ? "check on pop" : entry.done ? "check on" : "check"}
            onAnimationEnd={() => setPop(false)}
          >
            {entry.done ? <CheckMark /> : null}
          </span>
        </button>
        <div className="entry-body">
          <button type="button" className="name-btn" onClick={onHistory}>
            {entry.name}
          </button>
          <div className="sxr-row">
            <button type="button" className="sxr-btn" data-testid="sxr" onClick={onSxr}>
              {displaySxr(entry.sxr)}
            </button>
            {hint ? <span className={hint.up ? "hint up" : "hint"}>{hint.text}</span> : null}
          </div>
          {note ? <div className="note">{note}</div> : null}
          <div className="weight-row">
            <button
              type="button"
              className="step"
              aria-label={`Decrease ${entry.name} by 2.5 kilograms`}
              onClick={() => bump(-2.5)}
            >
              −
            </button>
            <input
              className="weight"
              inputMode="decimal"
              enterKeyHint="done"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label={`Weight for ${entry.name} in kilograms`}
              data-testid="weight"
              placeholder="–"
              value={shown}
              onFocus={(event) => {
                setDraft(formatWeight(entry.weight));
                event.currentTarget.scrollIntoView({ block: "center" });
              }}
              onChange={(event) => {
                const raw = event.target.value;
                setDraft(raw);
                const parsed = parseWeightInput(raw);
                if (parsed.ok) api.setWeight(entry.id, parsed.value);
              }}
              onBlur={() => setDraft(null)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
            />
            <span className="unit">kg</span>
            <button
              type="button"
              className="step"
              aria-label={`Increase ${entry.name} by 2.5 kilograms`}
              data-testid="weight-inc"
              onClick={() => bump(2.5)}
            >
              +
            </button>
          </div>
        </div>
        <button
          type="button"
          className="handle"
          data-nodrag
          aria-label={`Reorder ${entry.name}`}
          data-testid="reorder-handle"
          onPointerDown={(event) => {
            event.stopPropagation();
            onDragStart();
            controls.start(event);
          }}
        >
          <GripIcon />
        </button>
      </div>
    </Reorder.Item>
  );
}

function hintText(
  entry: Entry,
  previous: { weight: number; date: string } | null,
  dayDate: string,
): { text: string; up: boolean } | null {
  if (!previous) return null;
  const last = formatWeight(previous.weight);
  if (entry.weight == null || previous.date === dayDate || entry.weight === previous.weight) {
    return { text: `Last ${last}`, up: false };
  }
  if (entry.weight > previous.weight) return { text: `Up from ${last}`, up: true };
  return { text: `Down from ${last}`, up: false };
}
