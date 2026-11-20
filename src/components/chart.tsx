"use client";

import { chartGeometry, formatDay, formatWeight, roundWeight } from "@/lib/domain";

export function WeightChart({
  points,
  today,
}: {
  points: { date: string; weight: number }[];
  today: string;
}) {
  const geometry = chartGeometry(points, 320, 168);
  if (!geometry || points.length === 0) {
    return <p className="empty-copy">No weight logged yet.</p>;
  }
  const path = geometry.coords
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
  const first = points[0];
  const last = points[points.length - 1];
  const delta = roundWeight(last.weight - first.weight);
  const caption =
    points.length === 1
      ? `${formatWeight(last.weight)} kg`
      : `${formatWeight(last.weight)} kg · ${delta >= 0 ? "up" : "down"} ${formatWeight(Math.abs(delta))} since ${formatDay(first.date, today)}`;

  return (
    <>
      <p className="chart-caption">{caption}</p>
      <div className="chart-card">
        <svg viewBox="0 0 320 168" role="img" aria-label="Weight over time">
          <text x="8" y="22" fill="currentColor" opacity="0.45" fontSize="11">
            {formatWeight(geometry.max)}
          </text>
          <text x="8" y="150" fill="currentColor" opacity="0.45" fontSize="11">
            {formatWeight(geometry.min)}
          </text>
          <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {geometry.coords.map((point) => (
            <circle key={point.date} cx={point.x} cy={point.y} r="3.5" fill="var(--elevated)" stroke="var(--accent)" strokeWidth="2" />
          ))}
          <text x={geometry.coords[0].x} y="164" textAnchor="middle" fill="currentColor" opacity="0.45" fontSize="11">
            {formatDay(points[0].date, today).replace("Today", "Now")}
          </text>
          {points.length > 1 ? (
            <text
              x={geometry.coords[geometry.coords.length - 1].x}
              y="164"
              textAnchor="end"
              fill="currentColor"
              opacity="0.45"
              fontSize="11"
            >
              {formatDay(last.date, today)}
            </text>
          ) : null}
        </svg>
      </div>
    </>
  );
}
