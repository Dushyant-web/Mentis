"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface IntroSceneProps {
  progress: number;
  isActive: boolean;
}

export function IntroScene({ progress, isActive }: IntroSceneProps) {
  const artRef = useRef<HTMLDivElement>(null);

  // Subtle cursor parallax on the illustration — adds real depth to the hero.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion:reduce)").matches) return;
    const onMove = (e: MouseEvent) => {
      const art = artRef.current;
      if (!art) return;
      const px = e.clientX / window.innerWidth - 0.5;
      const py = e.clientY / window.innerHeight - 0.5;
      art.querySelectorAll<HTMLElement>("[data-depth]").forEach((el) => {
        const d = parseFloat(el.dataset.depth || "0");
        el.style.transform = `translate(${px * d * 26}px, ${py * d * 26}px)`;
      });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div className="h-full flex items-center justify-center px-6">
      <div className="container mx-auto max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Text Content */}
          <div
            className="space-y-8"
            style={{ transform: `translateY(${(1 - progress) * 30}px)`, opacity: isActive ? 1 : 0 }}
          >
            <div className="space-y-5">
              <div
                className={cn(
                  "inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-sm font-bold text-primary",
                  "bg-[#FCE6CE] border border-[#f3d3b0]",
                  isActive && "animate-fade-in-up"
                )}
              >
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Early Screening Matters
              </div>

              <h1
                className={cn("font-bold text-foreground", isActive && "animate-fade-in-up delay-100")}
                style={{
                  fontFamily: "var(--font-fredoka)",
                  fontSize: "clamp(2.75rem, 6.4vw, 5.5rem)",
                  lineHeight: 0.98,
                  letterSpacing: "-0.03em",
                }}
              >
                <span className="text-balance">Every child deserves to </span>
                <span className="relative inline-block text-primary">
                  shine
                  <span className="absolute left-0 right-0 -bottom-1 rounded-full bg-[#F4B740]" style={{ height: "0.13em" }} />
                </span>
              </h1>

              <p
                className={cn(
                  "text-lg lg:text-xl text-muted-foreground max-w-xl leading-relaxed font-medium",
                  isActive && "animate-fade-in-up delay-200"
                )}
              >
                MENTIS provides early dyslexia screening through innovative technology,
                helping children unlock their full learning potential.
              </p>
            </div>
          </div>

          {/* Illustration */}
          <div
            ref={artRef}
            className="relative flex items-center justify-center"
            style={{
              transform: `scale(${0.9 + progress * 0.1}) translateX(${progress * 20}px)`,
              opacity: isActive ? 1 : 0,
            }}
          >
            <div className="relative">
              {/* Warm depth glow */}
              <div
                className="absolute inset-0 -m-10 rounded-full blur-3xl"
                data-depth="0.4"
                style={{ background: "radial-gradient(circle at 50% 45%, rgb(244 183 64/.5), rgb(234 106 46/.14) 55%, transparent 72%)" }}
              />

              {/* Floating letter chips — the b/d/p/q reversals, on-theme depth decoration */}
              {[
                { ch: "b", cls: "-top-10 -left-8", color: "var(--mts-orange)", d: "0.9" },
                { ch: "d", cls: "top-4 -right-12", color: "var(--mts-orange-d)", d: "0.7" },
                { ch: "p", cls: "-bottom-6 -left-10", color: "var(--mts-amber)", d: "1.1" },
                { ch: "q", cls: "bottom-16 -right-10", color: "var(--mts-orange)", d: "0.6" },
              ].map((c) => (
                <div
                  key={c.ch}
                  data-depth={c.d}
                  className={cn("absolute w-14 h-14 rounded-2xl bg-card grid place-items-center animate-float", c.cls)}
                  style={{
                    fontFamily: "var(--font-fredoka)", fontWeight: 900, fontSize: 30, color: c.color,
                    boxShadow: "0 10px 24px -8px rgb(42 26 12/.28), 0 2px 0 #fff inset",
                  }}
                >
                  {c.ch}
                </div>
              ))}

              {/* Child figure (stylized) — now on an elevated, layered-shadow card */}
              <div className="relative w-64 h-80 lg:w-80 lg:h-96" data-depth="0.15">
                <div
                  className="absolute inset-0 bg-gradient-to-b from-secondary to-secondary/50 rounded-[3rem]"
                  style={{ boxShadow: "var(--mts-e3)" }}
                >
                  {/* Face area */}
                  <div className="absolute top-8 left-1/2 -translate-x-1/2 w-32 h-32 lg:w-40 lg:h-40 bg-[#FFE4C4] rounded-full shadow-inner">
                    <div className="absolute top-12 left-8 lg:left-10 w-4 h-4 lg:w-5 lg:h-5 bg-foreground rounded-full">
                      <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-background rounded-full" />
                    </div>
                    <div className="absolute top-12 right-8 lg:right-10 w-4 h-4 lg:w-5 lg:h-5 bg-foreground rounded-full">
                      <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-background rounded-full" />
                    </div>
                    <div className="absolute bottom-8 lg:bottom-10 left-1/2 -translate-x-1/2 w-12 h-6 border-b-4 border-primary rounded-b-full" />
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-36 lg:w-44 h-20 bg-[#8B4513] rounded-t-full" />
                  </div>

                  {/* Book in hands */}
                  <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-24 h-16 lg:w-28 lg:h-20 bg-primary rounded-lg shadow-lg transform -rotate-3">
                    <div className="absolute inset-2 bg-background/90 rounded flex items-center justify-center">
                      <div className="space-y-1">
                        <div className="w-12 h-1.5 bg-foreground/20 rounded" />
                        <div className="w-10 h-1.5 bg-foreground/20 rounded" />
                        <div className="w-14 h-1.5 bg-foreground/20 rounded" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stars decoration */}
                <svg className="absolute -top-12 -left-8 w-8 h-8 text-accent animate-pulse" data-depth="1.2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <svg className="absolute top-1/3 -right-10 w-6 h-6 text-primary animate-pulse delay-500" data-depth="1" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
