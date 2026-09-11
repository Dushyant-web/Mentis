"use client";

import { useEffect, useState, useRef, useCallback } from "react";

interface Letter {
  id: number;
  char: string;
  x: number;
  y: number;
  baseSize: number;
  rotation: number;
  color: string;
  glows: boolean;
  floatOffset: number;
  floatSpeed: number;
  driftX: number;
  driftY: number;
}

const DYSLEXIA_LETTERS = [
  "b", "d", "p", "q", "m", "w", "n", "u", "a", "e", "i", "o",
  "B", "D", "P", "Q", "M", "W", "N", "A", "E", "O",
  "s", "z", "S", "Z", "c", "C", "g", "G", "h", "H"
];

const COLORS = [
  "rgb(249, 115, 22)",   // orange-500
  "rgb(251, 146, 60)",   // orange-400
  "rgb(253, 186, 116)",  // orange-300
  "rgb(254, 215, 170)",  // orange-200
  "rgb(234, 88, 12)",    // orange-600
  "rgb(255, 237, 213)",  // orange-100
];

const LETTER_COUNT = 60;

export function JumbleLetters() {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [pageHeight, setPageHeight] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<(HTMLSpanElement | null)[]>([]);
  // Live drift positions, mutated per frame. Kept out of state on purpose:
  // calling setLetters() every frame re-rendered 60 nodes at 60fps, which pegged
  // the main thread hard enough that the browser stopped advancing CSS animation
  // clocks — leaving the scroll-story scenes frozen at their `from` keyframe.
  const posRef = useRef<{ x: number; y: number }[]>([]);
  const animationRef = useRef<number>(0);
  const timeRef = useRef(0);
  const pageHeightRef = useRef(0);
  const lastScrollY = useRef(0);
  const scrollThreshold = useRef(0);
  const scrollCountRef = useRef(0);
  const sizeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    pageHeightRef.current = pageHeight;
  }, [pageHeight]);

  // Track full page height. Rounded to the nearest 200px so ordinary layout
  // jitter does not count as a change and regenerate every letter.
  useEffect(() => {
    const updatePageHeight = () => {
      const fullHeight = Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.clientHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight
      );
      const bucketed = Math.round(fullHeight / 200) * 200;
      setPageHeight((prev) => (prev === bucketed ? prev : bucketed));
    };

    updatePageHeight();
    window.addEventListener("resize", updatePageHeight);
    const interval = setInterval(updatePageHeight, 2000);
    return () => {
      window.removeEventListener("resize", updatePageHeight);
      clearInterval(interval);
    };
  }, []);

  // Generate the letters once per page-height bucket.
  useEffect(() => {
    if (pageHeight === 0) return;

    const newLetters: Letter[] = [];
    for (let i = 0; i < LETTER_COUNT; i++) {
      newLetters.push({
        id: i,
        char: DYSLEXIA_LETTERS[Math.floor(Math.random() * DYSLEXIA_LETTERS.length)],
        x: Math.random() * 100,
        y: Math.random() * 100,
        baseSize: Math.random() * 50 + 24,
        rotation: Math.random() * 60 - 30,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        glows: Math.random() > 0.6,
        floatOffset: Math.random() * Math.PI * 2,
        floatSpeed: 0.3 + Math.random() * 1.2,
        driftX: (Math.random() - 0.5) * 0.015,
        driftY: (Math.random() - 0.5) * 0.008,
      });
    }
    posRef.current = newLetters.map((l) => ({ x: l.x, y: l.y }));
    setLetters(newLetters);
  }, [pageHeight]);

  // Drift + float, written straight to the DOM. Position is expressed as a
  // transform offset from each letter's static left/top, so no layout runs.
  useEffect(() => {
    if (letters.length === 0) return;

    const animate = () => {
      timeRef.current += 0.016;
      const width = containerRef.current?.offsetWidth ?? window.innerWidth;
      const height = pageHeightRef.current || 1;

      for (let i = 0; i < letters.length; i++) {
        const letter = letters[i];
        const pos = posRef.current[i];
        const node = nodesRef.current[i];
        if (!pos || !node) continue;

        pos.x += letter.driftX;
        pos.y += letter.driftY;
        if (pos.x > 105) pos.x = -5;
        if (pos.x < -5) pos.x = 105;
        if (pos.y > 102) pos.y = -2;
        if (pos.y < -2) pos.y = 102;

        const floatY = Math.sin(timeRef.current * letter.floatSpeed + letter.floatOffset) * 10;
        const floatX = Math.cos(timeRef.current * letter.floatSpeed * 0.7 + letter.floatOffset) * 6;
        const driftPxX = ((pos.x - letter.x) / 100) * width;
        const driftPxY = ((pos.y - letter.y) / 100) * height;
        const rotation = letter.rotation + Math.sin(timeRef.current * 0.5) * 3;

        node.style.transform =
          `translate(${floatX + driftPxX}px, ${floatY + driftPxY}px) rotate(${rotation}deg)`;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [letters]);

  // Pulse letter sizes as the page scrolls, then settle back. Font size is set
  // directly too — this used to run through state and re-render every letter.
  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    const scrollDelta = Math.abs(currentScrollY - lastScrollY.current);
    if (scrollDelta <= 80) return;

    scrollThreshold.current += scrollDelta;
    lastScrollY.current = currentScrollY;
    if (scrollThreshold.current <= 100) return;

    scrollThreshold.current = 0;
    scrollCountRef.current += 1;
    const multiplier = scrollCountRef.current % 2 === 0 ? 1.25 : 0.85;

    nodesRef.current.forEach((node, i) => {
      const letter = letters[i];
      if (node && letter) node.style.fontSize = `${letter.baseSize * multiplier}px`;
    });

    if (sizeTimeout.current) clearTimeout(sizeTimeout.current);
    sizeTimeout.current = setTimeout(() => {
      nodesRef.current.forEach((node, i) => {
        const letter = letters[i];
        if (node && letter) node.style.fontSize = `${letter.baseSize}px`;
      });
    }, 800);
  }, [letters]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (sizeTimeout.current) clearTimeout(sizeTimeout.current);
    };
  }, [handleScroll]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-x-0 top-0 pointer-events-none overflow-hidden z-0"
      style={{ height: `${pageHeight}px` }}
      aria-hidden="true"
    >
      {letters.map((letter, i) => (
        <span
          key={letter.id}
          ref={(el) => { nodesRef.current[i] = el; }}
          className="absolute font-display font-bold select-none"
          style={{
            left: `${letter.x}%`,
            top: `${(letter.y / 100) * pageHeight}px`,
            fontSize: `${letter.baseSize}px`,
            color: letter.color,
            opacity: letter.glows ? 0.4 : 0.2,
            transform: `rotate(${letter.rotation}deg)`,
            transition: "font-size 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
            textShadow: letter.glows
              ? `0 0 25px ${letter.color}, 0 0 50px ${letter.color}, 0 0 75px ${letter.color}`
              : "none",
            filter: letter.glows ? "blur(0.5px)" : "none",
            willChange: "transform",
          }}
        >
          {letter.char}
        </span>
      ))}
    </div>
  );
}
