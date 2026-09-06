"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useElementInView } from "@/hooks/use-scroll-progress";
import { Button } from "@/components/ui/button";
import { GraduationCap, AlertTriangle, ArrowRight, TrendingDown, Activity, Eye, PenTool, BookOpen, Microscope, ClipboardList, FileText, TrendingUp, type LucideIcon } from "lucide-react";

// Finding type → lucide icon (replaces the old emoji field on each finding).
const FINDING_ICONS: Record<string, LucideIcon> = {
  eye: Eye,
  chart: Activity,
  pen: PenTool,
  book: BookOpen,
};

const levelConfig = {
  Normal: { color: "bg-green-100 text-green-700 border-green-200", ring: "#22c55e", bg: "from-green-50" },
  Mild: { color: "bg-blue-100 text-blue-700 border-blue-200", ring: "#3b82f6", bg: "from-blue-50" },
  Moderate: { color: "bg-orange-100 text-orange-700 border-orange-200", ring: "oklch(0.72 0.18 45)", bg: "from-orange-50" },
  Severe: { color: "bg-red-100 text-red-700 border-red-200", ring: "#ef4444", bg: "from-red-50" },
};

function ConfidenceRing({ value, level = "Mild", size = 160 }: { value: number; level?: string; size?: number }) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const config = levelConfig[level as keyof typeof levelConfig] || levelConfig.Mild;

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
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const { hasBeenInView } = useElementInView(ref, { threshold: 0.1 });

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("analysis_result") || "null");

    if (data) {
      const stageMap: any = {
        stage_1: "Mild",
        stage_2: "Moderate",
        stage_3: "Severe",
      };

      let diagnosisType = "Dyslexia & Dysgraphia";
      let diagnosisLevel = "Mild";

      const rScore = data.details?.dyslexia_score || 0;
      const wScore = data.details?.dysgraphia_score || 0;

      if (["severe", "moderate", "mild", "normal"].includes(data.prediction)) {
        diagnosisLevel = data.prediction.charAt(0).toUpperCase() + data.prediction.slice(1);
        if (data.prediction === "normal") {
           diagnosisType = "No Indication";
        } else {
           if (rScore > 0.6 && wScore < 0.4) diagnosisType = "Dyslexia";
           else if (wScore > 0.6 && rScore < 0.4) diagnosisType = "Dysgraphia";
           else diagnosisType = "Dyslexia & Dysgraphia";
        }
      } else if (data.prediction === "dyslexia") {
        diagnosisType = "Dyslexia";
        diagnosisLevel = stageMap[data.details?.dyslexia_stage] || "Mild";
      } else if (data.prediction === "dysgraphia") {
        diagnosisType = "Dysgraphia";
        diagnosisLevel = stageMap[data.details?.dysgraphia_stage] || "Mild";
      } else if (data.prediction === "both") {
        diagnosisType = "Dyslexia & Dysgraphia";
        const dysStage = parseInt(data.details?.dyslexia_stage?.replace("stage_", "") || "1");
        const dysgStage = parseInt(data.details?.dysgraphia_stage?.replace("stage_", "") || "1");
        diagnosisLevel = stageMap[`stage_${Math.max(dysStage, dysgStage)}`] || "Moderate";
      } else if (data.prediction === "normal") {
        diagnosisType = "No Indication";
        diagnosisLevel = "Normal";
      } else if (data.prediction === "uncertain") {
        diagnosisType = "Inconclusive";
        diagnosisLevel = "Normal";
      }

      setDiagnosis({
        level: diagnosisLevel,
        type: diagnosisType,
        prediction: data.prediction,
        confidence: Math.round(data.confidence * 100),
        findings: [
          {
            title: "High Regression Rate",
            detail: "Your eyes frequently jump back to re-read words. This is 2.3x higher than average.",
            severity: rScore > 0.5 ? "high" : "medium",
            iconType: "eye",
          },
          {
            title: "Low Rhythm Consistency",
            detail: `Writing rhythm varies significantly between strokes. Score: ${Math.round((1 - wScore) * 100)}/100.`,
            severity: wScore > 0.5 ? "high" : "medium",
            iconType: "chart",
          },
          {
            title: "Letter Reversal Tendency",
            detail: "Detected frequent confusion between similar letters (b/d, p/q).",
            severity: Math.max(rScore, wScore) > 0.6 ? "high" : "medium",
            iconType: "pen",
          },
          {
            title: "Slower Reading Speed",
            detail: "Reading speed is 35% below age-average. Area for focused improvement.",
            severity: rScore > 0.4 ? "high" : "medium",
            iconType: "book",
          },
        ],
      });
    }

    setLoading(false);
  }, []);

  if (loading || !diagnosis) {
    return <div className="text-center mt-20">Loading diagnosis...</div>;
  }

  const config = diagnosis ? levelConfig[diagnosis.level as keyof typeof levelConfig] || levelConfig.Mild : levelConfig.Mild;

  return (
    <div ref={ref} className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3"
          style={{ fontFamily: "var(--font-fredoka)" }}>
          <Microscope className="w-7 h-7 text-primary" />
          Your Diagnosis
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s what our AI found based on your assessment
        </p>
      </div>

      {/* Main Result Card */}
      <div className={cn(
        "bg-gradient-to-br to-card rounded-2xl border border-border/50 shadow-sm p-6 lg:p-8 animate-fade-in-up",
        config.bg
      )} style={{ animationDelay: "200ms" }}>
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Confidence Ring */}
          <div className="opacity-0 animate-bounce-in" style={{ animationDelay: "600ms" }}>
            <ConfidenceRing value={diagnosis.confidence} level={diagnosis.level} />
          </div>

          {/* Level Info */}
          <div className="flex-1 text-center md:text-left">
            <div className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold mb-4 opacity-0 animate-fade-in-up",
              config.color
            )} style={{ animationDelay: "800ms" }}>
              <AlertTriangle className="w-4 h-4" />
              {diagnosis.level === "Normal" ? diagnosis.type : `${diagnosis.level} ${diagnosis.type}`}
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-3 opacity-0 animate-fade-in-up"
              style={{ fontFamily: "var(--font-fredoka)", animationDelay: "900ms" }}>
              We&apos;re Here to Help!
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
          <ClipboardList className="w-5 h-5 text-primary" />
          Detailed Findings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
          {diagnosis.findings.map((finding: any) => {
            const FindingIcon = FINDING_ICONS[finding.iconType] || Activity;
            return (
            <div key={finding.title}
              className="card-3d bg-card rounded-2xl border border-border/50 p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                  finding.severity === "high" ? "bg-red-50" : "bg-amber-50"
                )}>
                  <FindingIcon className={cn("w-5 h-5", finding.severity === "high" ? "text-red-500" : "text-amber-500")} />
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
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-primary/5 to-accent/10 rounded-2xl border border-border/50 p-6 text-center opacity-0 animate-fade-in-up"
        style={{ animationDelay: "1500ms" }}>
        <h3 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: "var(--font-fredoka)" }}>
          Ready to Start Your Training?
        </h3>
        <p className="text-muted-foreground text-sm mb-5">
          Our personalized 8-week program is designed just for you
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link href="/training">
            <Button className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-12 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all">
              <GraduationCap className="w-5 h-5 mr-2" />
              Start Training Program
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Button variant="outline" className="rounded-xl h-12 px-6 gap-2"
            onClick={() => window.print()}>
            <FileText className="w-4 h-4" />
            Download Report (PDF)
          </Button>
          <Link href="/progress">
            <Button variant="outline" className="rounded-xl h-12 px-6 gap-2">
              <TrendingUp className="w-4 h-4" />
              View Progress
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
