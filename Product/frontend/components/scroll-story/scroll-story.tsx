"use client";

import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { IntroScene } from "./intro-scene";
import { DeskScene } from "./desk-scene";
import { LaptopScene } from "./laptop-scene";
import { PenScene } from "./pen-scene";
import { AssessmentScene } from "./assessment-scene";

export function ScrollStory() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [currentScene, setCurrentScene] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const totalHeight = rect.height - windowHeight;
      
      // Calculate progress through the sticky section
      const scrolled = -rect.top;
      const progress = Math.max(0, Math.min(1, scrolled / totalHeight));
      
      setScrollProgress(progress);

      // Determine current scene based on progress
      if (progress < 0.15) setCurrentScene(0);
      else if (progress < 0.35) setCurrentScene(1);
      else if (progress < 0.55) setCurrentScene(2);
      else if (progress < 0.75) setCurrentScene(3);
      else setCurrentScene(4);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Calculate individual scene progress
  const getSceneProgress = (sceneIndex: number) => {
    const sceneStart = sceneIndex * 0.2;
    const sceneEnd = (sceneIndex + 1) * 0.2;
    const sceneProgress = (scrollProgress - sceneStart) / (sceneEnd - sceneStart);
    return Math.max(0, Math.min(1, sceneProgress));
  };

  return (
    <section
      ref={containerRef}
      className="relative"
      style={{ height: "500vh" }}
    >
      {/* Sticky container */}
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Background gradient */}
        <div
          className="absolute inset-0 transition-all duration-1000"
          style={{
            background: `linear-gradient(180deg, 
              oklch(0.98 0.02 70) 0%, 
              oklch(0.96 0.03 ${60 + scrollProgress * 20}) 50%, 
              oklch(0.99 0.01 ${80 - scrollProgress * 20}) 100%)`,
          }}
        />

        {/* Animated background shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Floating circles */}
          <div
            className="absolute w-96 h-96 rounded-full bg-primary/5 blur-3xl"
            style={{
              top: `${20 + scrollProgress * 30}%`,
              left: `${-10 + scrollProgress * 20}%`,
              transform: `scale(${1 + scrollProgress * 0.5})`,
            }}
          />
          <div
            className="absolute w-64 h-64 rounded-full bg-accent/10 blur-2xl"
            style={{
              bottom: `${10 + scrollProgress * 20}%`,
              right: `${-5 + scrollProgress * 15}%`,
              transform: `scale(${1 + scrollProgress * 0.3})`,
            }}
          />
          <div
            className="absolute w-48 h-48 rounded-full bg-secondary blur-xl"
            style={{
              top: `${50 - scrollProgress * 20}%`,
              right: `${30 - scrollProgress * 10}%`,
              opacity: 0.5 - scrollProgress * 0.3,
            }}
          />
        </div>

        {/* Scene container */}
        <div className="relative h-full flex items-center justify-center">
          {/* Scene 0: Intro */}
          <div
            className={cn(
              "absolute inset-0 transition-all duration-700",
              currentScene === 0 ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
            )}
          >
            <IntroScene progress={getSceneProgress(0)} isActive={currentScene === 0} />
          </div>

          {/* Scene 1: Desk */}
          <div
            className={cn(
              "absolute inset-0 transition-all duration-700",
              currentScene === 1 ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
            )}
          >
            <DeskScene progress={getSceneProgress(1)} isActive={currentScene === 1} />
          </div>

          {/* Scene 2: Laptop */}
          <div
            className={cn(
              "absolute inset-0 transition-all duration-700",
              currentScene === 2 ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
            )}
          >
            <LaptopScene progress={getSceneProgress(2)} isActive={currentScene === 2} />
          </div>

          {/* Scene 3: Pen */}
          <div
            className={cn(
              "absolute inset-0 transition-all duration-700",
              currentScene === 3 ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
            )}
          >
            <PenScene progress={getSceneProgress(3)} isActive={currentScene === 3} />
          </div>

          {/* Scene 4: Assessment */}
          <div
            className={cn(
              "absolute inset-0 transition-all duration-700",
              currentScene === 4 ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
            )}
          >
            <AssessmentScene progress={getSceneProgress(4)} isActive={currentScene === 4} />
          </div>
        </div>

        {/* Progress indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3">
          {[0, 1, 2, 3, 4].map((index) => (
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

        {/* Scroll indicator */}
        <div
          className={cn(
            "absolute bottom-8 right-8 flex flex-col items-center gap-2 transition-opacity duration-500",
            scrollProgress > 0.1 ? "opacity-0" : "opacity-100"
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
