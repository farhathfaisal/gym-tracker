"use client";

import { AnimatePresence, motion, useDragControls, useReducedMotion } from "framer-motion";
import { useEffect, type ReactNode } from "react";

const spring = { type: "spring" as const, stiffness: 420, damping: 36, mass: 0.82 };

export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const controls = useDragControls();

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="sheet-root">
          <motion.button
            type="button"
            className="backdrop"
            aria-label="Close"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
          />
          <motion.div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={reduce ? { duration: 0 } : spring}
            drag="y"
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.45 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 800) onClose();
            }}
          >
            <div className="sheet-grab" onPointerDown={(event) => controls.start(event)}>
              <div className="grabber" />
              <div className="sheet-head">
                <h2>{title}</h2>
                <button type="button" className="nav-btn" onClick={onClose}>
                  Done
                </button>
              </div>
            </div>
            <div className="sheet-body">{children}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
