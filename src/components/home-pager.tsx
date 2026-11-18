"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { ExerciseLibraryScreen } from "@/components/exercise-library-screen";
import { HomeScreen } from "@/components/home-screen";

export function HomePager() {
  const pagerRef = useRef<HTMLDivElement>(null);
  const placed = useRef(false);
  const [page, setPage] = useState(1);

  useLayoutEffect(() => {
    const node = pagerRef.current;
    if (!node) return;
    const place = () => {
      if (placed.current || node.clientWidth === 0) return;
      node.scrollLeft = node.clientWidth;
      placed.current = true;
      setPage(1);
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  function onScroll() {
    const node = pagerRef.current;
    if (!node || node.clientWidth === 0) return;
    setPage(node.scrollLeft < node.clientWidth / 2 ? 0 : 1);
  }

  return (
    <div className="pager" ref={pagerRef} onScroll={onScroll} aria-label="Workouts and exercises">
      <div className="pager-page" aria-hidden={page !== 0}>
        <ExerciseLibraryScreen embedded />
      </div>
      <div className="pager-page" aria-hidden={page !== 1}>
        <HomeScreen />
      </div>
    </div>
  );
}
