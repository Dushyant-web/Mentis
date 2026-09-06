"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Brain, Eye, PenTool, Sparkles, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";

// 🚀 SPEED: cap the number of points sent to /submit.
// Eye/pen capture can produce thousands of samples → huge JSON upload + slow
// feature extraction. Uniform down-sampling keeps the shape of the signal
// (start/end always preserved) while keeping the payload small.
function downsample<T>(arr: T[], maxPoints = 800): T[] {
  if (!Array.isArray(arr) || arr.length <= maxPoints) return arr;
  const step = arr.length / maxPoints;
  const out: T[] = [];
  for (let i = 0; i < maxPoints; i++) out.push(arr[Math.floor(i * step)]);
  out[out.length - 1] = arr[arr.length - 1]; // always keep the final sample
  return out;
}

const analysisSteps = [
  {
    icon: Eye,
    label: "Analyzing eye movement patterns",
    detail: "Tracking saccades, fixations, and regressions",
    duration: 3000,
  },
  {
    icon: PenTool,
    label: "Analyzing writing rhythm",
    detail: "Measuring stroke speed, pressure, and consistency",
    duration: 2500,
  },
  {
    icon: Brain,
    label: "Running AI diagnostic model",
    detail: "Processing 42 neuro-motor features",
    duration: 2000,
  },
  {
    icon: Sparkles,
    label: "Generating personalized insights",
    detail: "Building your learning profile",
    duration: 1500,
  },
];

export default function AnalysisPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [complete, setComplete] = useState(false);

  const [apiError, setApiError] = useState<string | null>(null);

  const submissionStarted = useRef(false);

  useEffect(() => {
    const sendFinalData = async () => {
      if (submissionStarted.current) return;
      submissionStarted.current = true;

      try {
        // 🔥 FIX: Use canonical key, with fallback
        const sessionId =
          localStorage.getItem("assessment_session_id") ||
          localStorage.getItem("session_id");
        
        if (!sessionId) {
          console.error("❌ No session ID found! Cannot submit assessment.");
          setApiError("No assessment session found. Please restart the assessment.");
          return;
        }

        const eyeTests = JSON.parse(localStorage.getItem("eye_tests") || "{}");
        let finalEyeData = Object.values(eyeTests).flat() as any[];
        
        // 🔥 FIX: Backend requires at least 2 points even if eye tracking was skipped
        if (finalEyeData.length < 2) {
          finalEyeData = [
            { x: 0, y: 0, time: Date.now() },
            { x: 0, y: 0, time: Date.now() + 100 }
          ];
        }

        let penData = JSON.parse(localStorage.getItem("pen_data") || "[]") as any[];
        const errors = JSON.parse(localStorage.getItem("assessment_errors") || "[]");

        // 🔥 FIX: Backend requires at least 2 points for pen_data too
        if (penData.length < 2) {
          console.warn("⚠️ Pen data missing or insufficient. Sending fallback points.");
          penData = [
            { x: 0, y: 0, time: Date.now(), pressure: 0, type: "start" },
            { x: 0, y: 0, time: Date.now() + 10, pressure: 0, type: "end" }
          ];
        }


        const data = await api.post("/assessment/submit", {
          session_id: Number(sessionId),
          eye_data: downsample(finalEyeData, 800),
          pen_data: downsample(penData, 1200),
          errors: errors
        });



        localStorage.setItem("analysis_result", JSON.stringify(data));
        localStorage.setItem("has_completed_assessment", "true");

      } catch (err: any) {
        console.error("❌ FINAL SUBMIT ERROR:", err);
        setApiError(err.message || "Failed to analyze data.");
      }
    };

    sendFinalData();

    let totalElapsed = 0;
    const totalDuration = analysisSteps.reduce((sum, s) => sum + s.duration, 0);

    const progressInterval = setInterval(() => {
      totalElapsed += 50;
      const pct = Math.min((totalElapsed / totalDuration) * 100, 100);
      setProgress(pct);

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

        setTimeout(() => {
          // If apiError exists, it will render the error UI.
          // Otherwise, redirect to Diagnosis.
          const errorCaught = document.getElementById("analysis-error-boundary");
          if (!errorCaught) {
              router.push("/diagnosis");
          }
        }, 1500);
      }
    }, 50);

    return () => clearInterval(progressInterval);
  }, []);

  if (apiError) {
    return (
      <div id="analysis-error-boundary" className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[70vh] text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
           <Brain className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-red-600 mb-2">Analysis Failed</h1>
        <p className="text-muted-foreground mb-6">We couldn&apos;t process your assessment: {apiError}</p>
        <button onClick={() => router.push("/dashboard")} className="px-6 py-2 bg-primary text-white rounded-lg">
          Return to Dashboard
        </button>
      </div>
    );
  }

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
        {complete ? "Analysis Complete!" : "Analyzing Your Data..."}
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
          const StepIcon = step.icon;
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
                  <StepIcon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} />
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
