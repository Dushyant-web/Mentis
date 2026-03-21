"use client";

import { useRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useElementInView } from "@/hooks/use-scroll-progress";
import { Button } from "@/components/ui/button";
import { GraduationCap, AlertTriangle, ArrowRight, TrendingDown, Activity, Eye, PenTool } from "lucide-react";

const levelConfig = {
  Normal: { color: "bg-green-100 text-green-700 border-green-200", ring: "#22c55e", bg: "from-green-50" },
  Mild: { color: "bg-blue-100 text-blue-700 border-blue-200", ring: "#3b82f6", bg: "from-blue-50" },
  Moderate: { color: "bg-orange-100 text-orange-700 border-orange-200", ring: "oklch(0.72 0.18 45)", bg: "from-orange-50" },
  Severe: { color: "bg-red-100 text-red-700 border-red-200", ring: "#ef4444", bg: "from-red-50" },
};

const diagnosis = {
  level: "Moderate" as keyof typeof levelConfig,
  confidence: 78,
  findings: [
    {
      icon: Eye,
      title: "High Regression Rate",
      detail: "Your eyes frequently jump back to re-read words. This is 2.3x higher than average.",
      severity: "high" as const,
      emoji: "👁️",
    },
    {
      icon: Activity,
      title: "Low Rhythm Consistency",
      detail: "Writing rhythm varies significantly between strokes. Score: 42/100.",
      severity: "medium" as const,
      emoji: "📊",
    },
    {
      icon: PenTool,
      title: "Letter Reversal Tendency",
      detail: "Detected frequent confusion between similar letters (b/d, p/q).",
      severity: "high" as const,
      emoji: "✏️",
    },
    {
      icon: TrendingDown,
      title: "Slower Reading Speed",
      detail: "Reading speed is 35% below age-average. Area for focused improvement.",
      severity: "medium" as const,
      emoji: "📖",
    },
  ],
};

function ConfidenceRing({ value, size = 160 }: { value: number; size?: number }) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const config = levelConfig[diagnosis.level];

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="currentColor" strokeWidth={strokeWidth}
          className="text-secondary" />
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={config.ring} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          className="progress-ring-circle" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-foreground">{value}%</span>
        <span className="text-xs text-muted-foreground mt-1">confidence</span>
      </div>
    </div>
  );
}

export default function DiagnosisPage() {
  const ref = useRef<HTMLDivElement>(null);
  const { hasBeenInView } = useElementInView(ref, { threshold: 0.1 });
  const config = levelConfig[diagnosis.level];

  return (
    <div ref={ref} className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className={cn("opacity-0", hasBeenInView && "animate-fade-in-up")}>
        <h1 className="text-3xl font-bold text-foreground"
          style={{ fontFamily: "var(--font-fredoka)" }}>
          🔬 Your Diagnosis
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s what our AI found based on your assessment
        </p>
      </div>

      {/* Main Result Card */}
      <div className={cn(
        "bg-gradient-to-br to-card rounded-2xl border border-border/50 shadow-sm p-6 lg:p-8 opacity-0",
        config.bg,
        hasBeenInView && "animate-fade-in-up"
      )} style={{ animationDelay: "200ms" }}>
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Confidence Ring */}
          <div className="opacity-0 animate-bounce-in" style={{ animationDelay: "600ms" }}>
            <ConfidenceRing value={diagnosis.confidence} />
          </div>

          {/* Level Info */}
          <div className="flex-1 text-center md:text-left">
            <div className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold mb-4 opacity-0 animate-fade-in-up",
              config.color
            )} style={{ animationDelay: "800ms" }}>
              <AlertTriangle className="w-4 h-4" />
              {diagnosis.level} Dyslexia
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-3 opacity-0 animate-fade-in-up"
              style={{ fontFamily: "var(--font-fredoka)", animationDelay: "900ms" }}>
              We&apos;re Here to Help! 💪
            </h2>
            <p className="text-muted-foreground opacity-0 animate-fade-in-up"
              style={{ animationDelay: "1000ms" }}>
              A <strong>{diagnosis.level.toLowerCase()}</strong> level means there are noticeable patterns,
              but with the right training, you can make amazing progress. Many learners like you
              have improved significantly — let&apos;s get started!
            </p>
          </div>
        </div>
      </div>

      {/* Findings */}
      <div>
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2 opacity-0 animate-fade-in-up"
          style={{ animationDelay: "1100ms" }}>
          📋 Detailed Findings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
          {diagnosis.findings.map((finding) => (
            <div key={finding.title}
              className="card-3d bg-card rounded-2xl border border-border/50 p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                  finding.severity === "high" ? "bg-red-50" : "bg-amber-50"
                )}>
                  <span className="text-lg">{finding.emoji}</span>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground text-sm mb-1">{finding.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{finding.detail}</p>
                </div>
              </div>
              <div className={cn(
                "mt-3 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                finding.severity === "high"
                  ? "bg-red-100 text-red-600"
                  : "bg-amber-100 text-amber-600"
              )}>
                {finding.severity === "high" ? "Needs Attention" : "Room for Growth"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-primary/5 to-accent/10 rounded-2xl border border-border/50 p-6 text-center opacity-0 animate-fade-in-up"
        style={{ animationDelay: "1500ms" }}>
        <h3 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: "var(--font-fredoka)" }}>
          Ready to Start Your Training? 🚀
        </h3>
        <p className="text-muted-foreground text-sm mb-5">
          Our personalized 8-week program is designed just for you
        </p>
        <Link href="/training">
          <Button className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-12 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all">
            <GraduationCap className="w-5 h-5 mr-2" />
            Start Training Program
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
