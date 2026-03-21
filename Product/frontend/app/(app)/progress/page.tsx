"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useElementInView } from "@/hooks/use-scroll-progress";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Activity, ArrowLeft, ArrowRight, Sparkles, Eye, PenTool } from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const readingSpeedData = [
  { week: "W1", speed: 85, avg: 120 },
  { week: "W2", speed: 92, avg: 120 },
  { week: "W3", speed: 88, avg: 120 },
  { week: "W4", speed: 105, avg: 120 },
  { week: "W5", speed: 112, avg: 120 },
  { week: "W6", speed: 118, avg: 120 },
  { week: "W7", speed: 125, avg: 120 },
  { week: "W8", speed: 138, avg: 120 },
];

const regressionData = [
  { week: "W1", rate: 45 },
  { week: "W2", rate: 42 },
  { week: "W3", rate: 38 },
  { week: "W4", rate: 34 },
  { week: "W5", rate: 30 },
  { week: "W6", rate: 26 },
  { week: "W7", rate: 22 },
  { week: "W8", rate: 18 },
];

const rhythmData = [
  { week: "W1", score: 42, target: 70 },
  { week: "W2", score: 48, target: 70 },
  { week: "W3", score: 52, target: 70 },
  { week: "W4", score: 58, target: 70 },
  { week: "W5", score: 63, target: 70 },
  { week: "W6", score: 67, target: 70 },
  { week: "W7", score: 74, target: 70 },
  { week: "W8", score: 78, target: 70 },
];

const insights = [
  {
    emoji: "🚀",
    title: "Reading speed improved by 62%",
    detail: "From 85 WPM to 138 WPM over 8 weeks. That's incredible progress!",
    type: "positive" as const,
  },
  {
    emoji: "👁️",
    title: "Regression rate dropped by 60%",
    detail: "Eye regressions went from 45% to 18%. Your focus is getting sharper.",
    type: "positive" as const,
  },
  {
    emoji: "✏️",
    title: "Rhythm score exceeded target!",
    detail: "You hit 78/100, surpassing the 70-point target. Keep it up!",
    type: "positive" as const,
  },
  {
    emoji: "🎯",
    title: "Suggested: Focus on fixation duration",
    detail: "Your fixation time is still slightly above average. Try the speed reading exercise.",
    type: "suggestion" as const,
  },
];

const chartTooltipStyle = {
  background: "oklch(1 0 0)",
  border: "1px solid oklch(0.92 0.02 60)",
  borderRadius: "12px",
  fontSize: "13px",
};

export default function ProgressPage() {
  const ref = useRef<HTMLDivElement>(null);
  const { hasBeenInView } = useElementInView(ref, { threshold: 0.1 });
  const [selectedWeek, setSelectedWeek] = useState(7); // 0-indexed, current is W8

  return (
    <div ref={ref} className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className={cn("opacity-0", hasBeenInView && "animate-fade-in-up")}>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3"
          style={{ fontFamily: "var(--font-fredoka)" }}>
          📊 Your Progress
        </h1>
        <p className="text-muted-foreground mt-1">
          Track your improvement journey over time
        </p>
      </div>

      {/* Week Navigation */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 shadow-sm flex items-center justify-between opacity-0 animate-fade-in-up"
        style={{ animationDelay: "200ms" }}>
        <Button variant="ghost" size="sm" className="rounded-lg"
          disabled={selectedWeek === 0}
          onClick={() => setSelectedWeek(Math.max(0, selectedWeek - 1))}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Previous
        </Button>
        <div className="flex items-center gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <button key={i}
              onClick={() => setSelectedWeek(i)}
              className={cn(
                "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                i === selectedWeek
                  ? "bg-primary text-primary-foreground shadow-md scale-110"
                  : i <= selectedWeek
                  ? "bg-primary/10 text-primary hover:bg-primary/20"
                  : "bg-secondary text-muted-foreground"
              )}>
              W{i + 1}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="rounded-lg"
          disabled={selectedWeek === 7}
          onClick={() => setSelectedWeek(Math.min(7, selectedWeek + 1))}>
          Next <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-children">
        <div className="card-3d bg-card rounded-2xl border border-border/50 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Eye className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Reading Speed</p>
              <p className="text-2xl font-bold text-foreground">
                {readingSpeedData[selectedWeek].speed} <span className="text-sm font-normal text-muted-foreground">WPM</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
            <TrendingUp className="w-3 h-3" />
            +{Math.round((readingSpeedData[selectedWeek].speed / readingSpeedData[0].speed - 1) * 100)}% from start
          </div>
        </div>

        <div className="card-3d bg-card rounded-2xl border border-border/50 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Regression Rate</p>
              <p className="text-2xl font-bold text-foreground">
                {regressionData[selectedWeek].rate}<span className="text-sm font-normal text-muted-foreground">%</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
            <TrendingDown className="w-3 h-3" />
            -{regressionData[0].rate - regressionData[selectedWeek].rate}% improvement
          </div>
        </div>

        <div className="card-3d bg-card rounded-2xl border border-border/50 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <PenTool className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Rhythm Score</p>
              <p className="text-2xl font-bold text-foreground">
                {rhythmData[selectedWeek].score}<span className="text-sm font-normal text-muted-foreground">/100</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
            <TrendingUp className="w-3 h-3" />
            +{rhythmData[selectedWeek].score - rhythmData[0].score} points gained
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Reading Speed Chart */}
        <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm opacity-0 animate-fade-in-up"
          style={{ animationDelay: "600ms" }}>
          <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" /> Reading Speed
          </h3>
          <p className="text-xs text-muted-foreground mb-4">WPM vs. age average (dashed)</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={readingSpeedData}>
                <defs>
                  <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.72 0.18 45)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.72 0.18 45)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.02 60)" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="oklch(0.5 0.03 45)" />
                <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.5 0.03 45)" />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Line type="monotone" dataKey="avg" stroke="oklch(0.7 0.02 45)" strokeWidth={1.5}
                  strokeDasharray="5 5" dot={false} name="Average" />
                <Area type="monotone" dataKey="speed" stroke="oklch(0.72 0.18 45)"
                  strokeWidth={2.5} fill="url(#speedGrad)" name="Your Speed" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Regression Rate Chart */}
        <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm opacity-0 animate-fade-in-up"
          style={{ animationDelay: "700ms" }}>
          <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-500" /> Regression Rate
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Lower is better — eye backtracking %</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={regressionData}>
                <defs>
                  <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.02 60)" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="oklch(0.5 0.03 45)" />
                <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.5 0.03 45)" domain={[0, 50]} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Area type="monotone" dataKey="rate" stroke="#3b82f6"
                  strokeWidth={2.5} fill="url(#regGrad)" name="Regression %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Rhythm */}
      <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm opacity-0 animate-fade-in-up"
        style={{ animationDelay: "800ms" }}>
        <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
          <PenTool className="w-4 h-4 text-amber-500" /> Rhythm Score
        </h3>
        <p className="text-xs text-muted-foreground mb-4">Writing consistency score vs. target (dashed)</p>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rhythmData}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.02 60)" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="oklch(0.5 0.03 45)" />
              <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.5 0.03 45)" domain={[0, 100]} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Line type="monotone" dataKey="target" stroke="oklch(0.7 0.02 45)" strokeWidth={1.5}
                strokeDasharray="5 5" dot={false} name="Target" />
              <Line type="monotone" dataKey="score" stroke="#f59e0b"
                strokeWidth={2.5} dot={{ r: 4, fill: "#f59e0b" }} name="Your Score" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insights */}
      <div>
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2 opacity-0 animate-fade-in-up"
          style={{ animationDelay: "900ms" }}>
          <Sparkles className="w-4 h-4 text-primary" /> Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 stagger-children">
          {insights.map((insight, i) => (
            <div key={i} className={cn(
              "card-3d rounded-2xl border p-4 shadow-sm",
              insight.type === "positive"
                ? "bg-green-50/50 border-green-200/50"
                : "bg-blue-50/50 border-blue-200/50"
            )}>
              <div className="flex items-start gap-3">
                <span className="text-2xl">{insight.emoji}</span>
                <div>
                  <h4 className="font-semibold text-sm text-foreground">{insight.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{insight.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
