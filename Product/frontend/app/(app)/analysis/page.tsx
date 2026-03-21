"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Brain, Eye, PenTool, Sparkles, CheckCircle } from "lucide-react";

const analysisSteps = [
  {
    icon: Eye,
    label: "Analyzing eye movement patterns",
    detail: "Tracking saccades, fixations, and regressions",
    emoji: "👁️",
    duration: 3000,
  },
  {
    icon: PenTool,
    label: "Analyzing writing rhythm",
    detail: "Measuring stroke speed, pressure, and consistency",
    emoji: "✏️",
    duration: 2500,
  },
  {
    icon: Brain,
    label: "Running AI diagnostic model",
    detail: "Processing 42 neuro-motor features",
    emoji: "🧠",
    duration: 2000,
  },
  {
    icon: Sparkles,
    label: "Generating personalized insights",
    detail: "Building your learning profile",
    emoji: "✨",
    duration: 1500,
  },
];

export default function AnalysisPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    let totalElapsed = 0;
    const totalDuration = analysisSteps.reduce((sum, s) => sum + s.duration, 0);

    const progressInterval = setInterval(() => {
      totalElapsed += 50;
      const pct = Math.min((totalElapsed / totalDuration) * 100, 100);
      setProgress(pct);

      // Determine current step
      let elapsed = 0;
      for (let i = 0; i < analysisSteps.length; i++) {
        elapsed += analysisSteps[i].duration;
        if (totalElapsed < elapsed) {
          setCurrentStep(i);
          break;
        }
      }

      if (totalElapsed >= totalDuration) {
        clearInterval(progressInterval);
        setComplete(true);
        setTimeout(() => router.push("/diagnosis"), 1500);
      }
    }, 50);

    return () => clearInterval(progressInterval);
  }, [router]);

  return (
    <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[70vh]">
      {/* Neural network visual */}
      <div className="relative w-48 h-48 mb-10 opacity-0 animate-bounce-in">
        {/* Rotating outer ring */}
        <div className="absolute inset-0 rounded-full border-4 border-dashed border-primary/20 animate-spin-slow" />
        <div className="absolute inset-3 rounded-full border-2 border-dashed border-accent/30 animate-spin-slow"
          style={{ animationDirection: "reverse", animationDuration: "12s" }} />

        {/* Pulsing rings */}
        <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-pulse-ring" />
        <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-pulse-ring"
          style={{ animationDelay: "1s" }} />

        {/* Center brain icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500",
            complete ? "bg-green-100 scale-110" : "bg-primary/10"
          )}>
            {complete ? (
              <CheckCircle className="w-10 h-10 text-green-500" />
            ) : (
              <Brain className="w-10 h-10 text-primary animate-pulse-soft" />
            )}
          </div>
        </div>

        {/* Orbiting dots */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="absolute inset-0 animate-spin-slow"
            style={{
              animationDuration: `${4 + i}s`,
              animationDelay: `${i * 0.5}s`,
            }}>
            <div className="absolute w-2.5 h-2.5 rounded-full bg-primary/50"
              style={{
                top: "50%",
                left: i % 2 === 0 ? "-4px" : "auto",
                right: i % 2 !== 0 ? "-4px" : "auto",
              }} />
          </div>
        ))}
      </div>

      {/* Title */}
      <h1 className="text-2xl lg:text-3xl font-bold text-foreground text-center mb-3 opacity-0 animate-fade-in-up"
        style={{ fontFamily: "var(--font-fredoka)", animationDelay: "300ms" }}>
        {complete ? "Analysis Complete! 🎉" : "Analyzing Your Data..."}
      </h1>
      <p className="text-muted-foreground text-center mb-8 opacity-0 animate-fade-in-up"
        style={{ animationDelay: "400ms" }}>
        {complete
          ? "Redirecting to your results..."
          : "Our AI is processing your reading and writing data"}
      </p>

      {/* Progress bar */}
      <div className="w-full max-w-md mb-8 opacity-0 animate-fade-in-up"
        style={{ animationDelay: "500ms" }}>
        <div className="flex justify-between text-xs text-muted-foreground mb-2">
          <span>Processing</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-3 bg-secondary rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-300 relative"
            style={{
              width: `${progress}%`,
              background: complete
                ? "oklch(0.65 0.15 145)"
                : "linear-gradient(90deg, oklch(0.72 0.18 45), oklch(0.85 0.14 70))",
            }}>
            {!complete && <div className="absolute inset-0 animate-shimmer" />}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="w-full max-w-md space-y-3 opacity-0 animate-fade-in-up"
        style={{ animationDelay: "600ms" }}>
        {analysisSteps.map((step, i) => {
          const isActive = i === currentStep && !complete;
          const isDone = i < currentStep || complete;
          return (
            <div key={i} className={cn(
              "flex items-center gap-4 p-3.5 rounded-xl transition-all duration-500",
              isActive && "bg-primary/5 border border-primary/20 scale-[1.02]",
              isDone && "bg-green-50/50",
              !isActive && !isDone && "opacity-40"
            )}>
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all",
                isDone ? "bg-green-100" : isActive ? "bg-primary/10" : "bg-secondary"
              )}>
                {isDone ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <span className="text-lg">{step.emoji}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-medium",
                  isDone ? "text-green-700" : isActive ? "text-foreground" : "text-muted-foreground"
                )}>
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground truncate">{step.detail}</p>
              </div>
              {isActive && (
                <div className="flex gap-1">
                  {[0, 1, 2].map((d) => (
                    <div key={d} className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                      style={{ animationDelay: `${d * 0.15}s` }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
