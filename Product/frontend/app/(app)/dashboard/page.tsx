"use client";

import { useRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useElementInView } from "@/hooks/use-scroll-progress";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  PenTool,
  GraduationCap,
  TrendingUp,
  Zap,
  Target,
  CheckCircle2,
  Clock,
  Star,
  ArrowRight,
} from "lucide-react";
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

// Mock data
const readingData = [
  { week: "W1", speed: 85 },
  { week: "W2", speed: 92 },
  { week: "W3", speed: 88 },
  { week: "W4", speed: 105 },
  { week: "W5", speed: 112 },
  { week: "W6", speed: 118 },
  { week: "W7", speed: 125 },
  { week: "W8", speed: 138 },
];

const rhythmData = [
  { week: "W1", score: 42 },
  { week: "W2", score: 48 },
  { week: "W3", score: 52 },
  { week: "W4", score: 58 },
  { week: "W5", score: 63 },
  { week: "W6", score: 67 },
  { week: "W7", score: 74 },
  { week: "W8", score: 78 },
];

const dailyGoals = [
  { id: 1, label: "Complete reading exercise", done: true, emoji: "📖" },
  { id: 2, label: "Practice writing patterns", done: true, emoji: "✏️" },
  { id: 3, label: "Rhythm training session", done: false, emoji: "🎵" },
  { id: 4, label: "Review progress report", done: false, emoji: "📊" },
];

function ProgressRing({ value, size = 120, strokeWidth = 10, color = "oklch(0.72 0.18 45)" }: {
  value: number; size?: number; strokeWidth?: number; color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="currentColor" strokeWidth={strokeWidth}
        className="text-secondary" />
      <circle cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        className="progress-ring-circle transition-all duration-1000" />
    </svg>
  );
}

export default function DashboardPage() {
  const headerRef = useRef<HTMLDivElement>(null);
  const { hasBeenInView } = useElementInView(headerRef, { threshold: 0.1 });
  const completedGoals = dailyGoals.filter((g) => g.done).length;
  const goalProgress = (completedGoals / dailyGoals.length) * 100;

  return (
    <div ref={headerRef} className="space-y-6 lg:space-y-8">
      {/* Welcome Header */}
      <div className={cn("opacity-0", hasBeenInView && "animate-fade-in-up")}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground"
              style={{ fontFamily: "var(--font-fredoka)" }}>
              Hey Alex! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Ready for another brain-boosting day? Let&apos;s keep going! 🚀
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/reading-test">
              <Button className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all">
                <Zap className="w-4 h-4 mr-2" />
                Start Test
              </Button>
            </Link>
            <Link href="/training">
              <Button variant="outline" className="rounded-xl border-border hover:bg-secondary hover:border-primary/30 transition-all">
                <GraduationCap className="w-4 h-4 mr-2" />
                Continue Training
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Status Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 stagger-children">
        {/* Level Card */}
        <div className="card-3d bg-card rounded-2xl border border-border/50 p-5 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">
              Moderate
            </span>
          </div>
          <h3 className="text-sm text-muted-foreground mb-1">Current Level</h3>
          <p className="text-lg font-bold text-foreground">Moderate Dyslexia</p>
        </div>

        {/* Confidence Card */}
        <div className="card-3d bg-card rounded-2xl border border-border/50 p-5 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Star className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-2xl font-bold text-foreground">78%</span>
          </div>
          <h3 className="text-sm text-muted-foreground mb-1">Confidence Score</h3>
          <div className="w-full bg-secondary rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full transition-all duration-1000" style={{ width: "78%" }} />
          </div>
        </div>

        {/* Reading Speed Card */}
        <div className="card-3d bg-card rounded-2xl border border-border/50 p-5 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
              <TrendingUp className="w-3 h-3" /> +40%
            </span>
          </div>
          <h3 className="text-sm text-muted-foreground mb-1">Reading Speed</h3>
          <p className="text-lg font-bold text-foreground">138 WPM</p>
        </div>

        {/* Streak Card */}
        <div className="card-3d bg-card rounded-2xl border border-border/50 p-5 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Zap className="w-5 h-5 text-amber-500" />
            </div>
          </div>
          <h3 className="text-sm text-muted-foreground mb-1">Day Streak</h3>
          <p className="text-lg font-bold text-foreground">7 Days 🔥</p>
        </div>
      </div>

      {/* Charts + Daily Goals Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Reading Speed Chart */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border/50 p-5 shadow-sm opacity-0 animate-fade-in-up"
          style={{ animationDelay: "600ms" }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                Reading Speed
              </h3>
              <p className="text-xs text-muted-foreground mt-1">Words per minute over 8 weeks</p>
            </div>
            <Link href="/progress">
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary rounded-lg">
                View All <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={readingData}>
                <defs>
                  <linearGradient id="readingGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.72 0.18 45)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.72 0.18 45)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.02 60)" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="oklch(0.5 0.03 45)" />
                <YAxis tick={{ fontSize: 12 }} stroke="oklch(0.5 0.03 45)" />
                <Tooltip
                  contentStyle={{
                    background: "oklch(1 0 0)",
                    border: "1px solid oklch(0.92 0.02 60)",
                    borderRadius: "12px",
                    fontSize: "13px",
                  }}
                />
                <Area type="monotone" dataKey="speed" stroke="oklch(0.72 0.18 45)"
                  strokeWidth={3} fill="url(#readingGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Goals */}
        <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm opacity-0 animate-fade-in-up"
          style={{ animationDelay: "800ms" }}>
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            Daily Goals
          </h3>

          {/* Progress Ring */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <ProgressRing value={goalProgress} size={100} strokeWidth={8} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-foreground">
                  {completedGoals}/{dailyGoals.length}
                </span>
              </div>
            </div>
          </div>

          {/* Goal Checklist */}
          <div className="space-y-2">
            {dailyGoals.map((goal) => (
              <div key={goal.id}
                className={cn(
                  "flex items-center gap-3 p-2.5 rounded-xl transition-all",
                  goal.done ? "bg-green-50/50" : "bg-secondary/30 hover:bg-secondary/50"
                )}>
                <span className="text-lg">{goal.emoji}</span>
                <span className={cn(
                  "text-sm flex-1",
                  goal.done ? "line-through text-muted-foreground" : "text-foreground"
                )}>
                  {goal.label}
                </span>
                {goal.done && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rhythm Score Chart */}
      <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm opacity-0 animate-fade-in-up"
        style={{ animationDelay: "1000ms" }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <PenTool className="w-4 h-4 text-accent-foreground" />
              Writing Rhythm Score
            </h3>
            <p className="text-xs text-muted-foreground mt-1">Consistency score (0-100) over 8 weeks</p>
          </div>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rhythmData}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.02 60)" />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="oklch(0.5 0.03 45)" />
              <YAxis tick={{ fontSize: 12 }} stroke="oklch(0.5 0.03 45)" domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  background: "oklch(1 0 0)",
                  border: "1px solid oklch(0.92 0.02 60)",
                  borderRadius: "12px",
                  fontSize: "13px",
                }}
              />
              <Line type="monotone" dataKey="score" stroke="oklch(0.85 0.14 70)"
                strokeWidth={3} dot={{ r: 4, fill: "oklch(0.85 0.14 70)" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 opacity-0 animate-fade-in-up"
        style={{ animationDelay: "1200ms" }}>
        <Link href="/reading-test" className="card-3d group">
          <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl border border-border/50 p-6 text-center hover:border-primary/30 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <BookOpen className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Reading Test</h3>
            <p className="text-xs text-muted-foreground">Test your reading with eye tracking</p>
          </div>
        </Link>
        <Link href="/writing-test" className="card-3d group">
          <div className="bg-gradient-to-br from-accent/10 to-yellow-50 rounded-2xl border border-border/50 p-6 text-center hover:border-accent/50 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <PenTool className="w-7 h-7 text-amber-600" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Writing Test</h3>
            <p className="text-xs text-muted-foreground">Practice handwriting patterns</p>
          </div>
        </Link>
        <Link href="/training" className="card-3d group">
          <div className="bg-gradient-to-br from-blue-50 to-primary/5 rounded-2xl border border-border/50 p-6 text-center hover:border-blue-200 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <GraduationCap className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Training</h3>
            <p className="text-xs text-muted-foreground">Continue your personalized course</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
