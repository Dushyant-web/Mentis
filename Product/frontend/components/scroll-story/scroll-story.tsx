"use client";

import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { IntroScene } from "./intro-scene";
import { DeskScene } from "./desk-scene";
import { LaptopScene } from "./laptop-scene";
import { PenScene } from "./pen-scene";
import { AssessmentScene } from "./assessment-scene";

const SCENES = [IntroScene, DeskScene, LaptopScene, PenScene, AssessmentScene];

export function ScrollStory() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [currentScene, setCurrentScene] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const totalHeight = rect.height - window.innerHeight;
      const scrolled = -rect.top;
      const progress = totalHeight > 0 ? Math.max(0, Math.min(1, scrolled / totalHeight)) : 0;
      setScrollProgress(progress);
      const scene = Math.min(SCENES.length - 1, Math.max(0, Math.floor(progress * SCENES.length)));
      setCurrentScene(scene);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 0→1 progress within the active scene's band (drives parallax transforms).
  const sceneProgress = Math.max(0, Math.min(1, scrollProgress * SCENES.length - currentScene));
  const ActiveScene = SCENES[currentScene];

  return (
    <section ref={containerRef} className="relative" style={{ height: "500vh" }}>
      {/* Pinned viewport. Solid opaque background + z-10 so it always sits ABOVE
          the z-0 jumble-letters layer (that was the blank-scene cause). */}
      <div className="sticky top-0 h-screen overflow-hidden z-10 bg-background">
        {/* soft brand wash on top of the solid base */}
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/30 via-transparent to-transparent pointer-events-none" />

        {/* Only the active scene is rendered — guaranteed visible, no opacity stacking. */}
        <div key={currentScene} className="relative h-full animate-fade-in">
          <ActiveScene progress={sceneProgress} isActive />
        </div>

        {/* Progress dots */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20">
          {SCENES.map((_, index) => (
            <div
              key={index}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                currentScene === index
                  ? "bg-primary w-8"
                  : currentScene > index
                  ? "bg-primary/50"
                  : "bg-foreground/20"
              )}
            />
          ))}
        </div>

        {/* Scroll hint */}
        <div
          className={cn(
            "absolute bottom-8 right-8 flex flex-col items-center gap-2 transition-opacity duration-500 z-20",
            scrollProgress > 0.05 ? "opacity-0" : "opacity-100"
          )}
        >
          <span className="text-sm text-muted-foreground">Scroll to explore</span>
          <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-1">
            <div className="w-1.5 h-3 rounded-full bg-primary animate-bounce" />
          </div>
        </div>
      </div>
    </section>
  );
}
