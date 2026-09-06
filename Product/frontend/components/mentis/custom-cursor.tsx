"use client";

import { useEffect } from "react";

/**
 * Reticle cursor — a slowly scanning ring + dot that snaps solid and swells over
 * anything interactive. Mount once on pages that opt in (marketing/landing). Only
 * activates on fine pointers; touch devices keep the native cursor.
 */
export function CustomCursor() {
  useEffect(() => {
    const fine = window.matchMedia("(hover:hover) and (pointer:fine)");
    if (!fine.matches) return;

    const ring = document.createElement("div");
    const dot = document.createElement("div");
    ring.className = "mts-cursor-ring";
    dot.className = "mts-cursor-dot";
    document.body.append(ring, dot);
    document.body.classList.add("mts-cursor-active");

    let mx = 0, my = 0, rx = 0, ry = 0, raf = 0;
    const onMove = (e: MouseEvent) => {
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx + "px"; dot.style.top = my + "px";
    };
    const loop = () => {
      rx += (mx - rx) * 0.2; ry += (my - ry) * 0.2;
      ring.style.left = rx + "px"; ring.style.top = ry + "px";
      raf = requestAnimationFrame(loop);
    };
    // Grow over interactive elements via event delegation (survives re-renders).
    const interactive = (t: EventTarget | null) =>
      t instanceof Element && !!t.closest("a,button,[data-cursor],input,textarea,select,[role='button']");
    const onOver = (e: MouseEvent) => { if (interactive(e.target)) ring.classList.add("big"); };
    const onOut = (e: MouseEvent) => { if (interactive(e.target)) ring.classList.remove("big"); };

    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      document.body.classList.remove("mts-cursor-active");
      ring.remove(); dot.remove();
    };
  }, []);

  return null;
}
