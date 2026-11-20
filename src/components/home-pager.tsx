"use client";

import { useRef, useState } from "react";
import { ExerciseLibraryScreen } from "@/components/exercise-library-screen";
import { HomeScreen } from "@/components/home-screen";

export function HomePager() {
  const pagerRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);

  function onScroll() {
    const node = pagerRef.current;
    if (!node || node.clientWidth === 0) return;
    setPage(node.scrollLeft > node.clientWidth / 2 ? 1 : 0);
  }

  return (
    <div className="pager" ref={pagerRef} onScroll={onScroll} aria-label="Workouts and exercises">
      <div className="pager-page" aria-hidden={page !== 0}>
        <HomeScreen />
      </div>
      <div className="pager-page" aria-hidden={page !== 1}>
        <ExerciseLibraryScreen embedded />
      </div>
    </div>
  );
}
