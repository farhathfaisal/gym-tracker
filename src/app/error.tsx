"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="boot">
      <p>Something went wrong.</p>
      <button type="button" className="primary" onClick={reset} style={{ width: 200 }}>
        Try again
      </button>
    </div>
  );
}
