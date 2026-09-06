"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/auth";
import {
  motion,
  AnimatePresence,
  animate,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import {
  BookOpen,
  PenTool,
  GraduationCap,
  TrendingUp,
  Zap,
  Target,
  CheckCircle,
  Star,
  ArrowRight,
  Lock,
  Eye,
  Music,
  Brain,
  Hand,
  Rocket,
  Flame,
  Pencil,
  Upload,
  X,
  FileText,
  Loader2,
  type LucideIcon,
} from "lucide-react";

// Maps an exercise type/category to a lucide icon (replaces the old emoji field).
const GOAL_ICONS: Record<string, LucideIcon> = {
  eye: Eye,
  pen: PenTool,
  rhythm: Music,
  reading: BookOpen,
  writing: Pencil,
  brain: Brain,
};

function GoalIcon({ name, className }: { name?: string; className?: string }) {
  const Icon = (name && GOAL_ICONS[name]) || Brain;
  return <Icon className={className} />;
}
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
import { api, API_BASE_URL } from "@/lib/api";

const getLabel = (value: number) => {
  if (value >= 85) return "Excellent";
  if (value >= 70) return "Good";
  if (value >= 50) return "Needs Improvement";
  return "Weak";
};

// Strong Typings for Recharts & State
interface ChartDataPoint {
  label: string;
  speed?: number;
  score?: number;
}

interface DailyGoal {
  id: number;
  label: string;
  done: boolean;
  iconType: string;
  locked?: boolean;
  xp?: number;
  reason?: string;
  focus?: string;
}

/* ----------------------------- Motion presets ----------------------------- */

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 260, damping: 24 },
  },
};

const goalVariants: Variants = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 26 } },
  exit: { opacity: 0, x: 24, transition: { duration: 0.2 } },
};

// Hover/tap behaviour shared across the stat cards.
const cardHover = {
  whileHover: { y: -6, transition: { type: "spring" as const, stiffness: 400, damping: 25 } },
  whileTap: { scale: 0.98 },
};

/* --------------------------- Animated number ----------------------------- */

function AnimatedNumber({
  value,
  suffix = "",
  className,
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (reduce) {
      node.textContent = `${Math.round(value)}${suffix}`;
      return;
    }
    const controls = animate(0, value, {
      duration: 1.1,
      ease: "easeOut",
      onUpdate(v) {
        node.textContent = `${Math.round(v)}${suffix}`;
      },
    });
    return () => controls.stop();
  }, [value, suffix, reduce]);

  return (
    <span ref={ref} className={className}>
      0{suffix}
    </span>
  );
}

/* --------------------------- Animated ring ------------------------------- */

function ProgressRing({
  value,
  size = 120,
  strokeWidth = 10,
  color = "oklch(0.72 0.18 45)",
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-secondary"
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeLinecap="round"
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
    </svg>
  );
}

/* --------------------------- Thin progress bar --------------------------- */

function MotionBar({ value, className }: { value: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ width: 0 }}
      animate={{ width: `${value}%` }}
      transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
    />
  );
}

/* -------------------------------- Page ----------------------------------- */

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  // 📄 Dyslexia-friendly PDF reader
  const [readerOpen, setReaderOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfText, setPdfText] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfError(null);
    setPdfText(null);
    setPdfName(file.name);
    setPdfLoading(true);
    try {
      const token = localStorage.getItem("token");
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/dashboard/scan-pdf`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Could not read this PDF");
      }
      const json = await res.json();
      setPdfText(json.text || "");
    } catch (err: any) {
      setPdfError(err.message || "Something went wrong");
    } finally {
      setPdfLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const [data, setData] = useState<any>(null);
  const [readingData, setReadingData] = useState<ChartDataPoint[]>([]);
  const [rhythmData, setRhythmData] = useState<ChartDataPoint[]>([]);
  const [dailyGoals, setDailyGoals] = useState<DailyGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [focusArea, setFocusArea] = useState<string>("general");
  const [intelligenceScore, setIntelligenceScore] = useState<number>(0);
  const [realStreak, setRealStreak] = useState<number>(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [xpTotal, setXpTotal] = useState(0);

  useEffect(() => {
    setMounted(true);
    setUser(getUser());
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        // Fire parallel API calls
        const [summaryRes, progressRes, trainingRes, planRes] = await Promise.all([
          api.request("/dashboard/summary", "GET", undefined, token || undefined).catch(() => null),
          api.request("/dashboard/progress-graph", "GET", undefined, token || undefined).catch(() => null),
          api.request("/dashboard/training-progress", "GET", undefined, token || undefined).catch(() => null),
          api.request("/training/plan", "GET", undefined, token || undefined).catch(() => null),
        ]);

        setData(summaryRes);
        if (summaryRes) {
          const insights = summaryRes.insights || [];
          const mainIssue = summaryRes.summary?.main_issue || "general";

          // 🔥 SYNC XP STATE EARLY
          setXpEarned(summaryRes.summary?.xp_earned || 0);
          setXpTotal(summaryRes.summary?.xp_total || 0);

          // 🔥 DECISION LAYER
          let focus = "general";
          if (mainIssue === "writing") focus = "writing";
          else if (mainIssue === "reading") focus = "reading";
          else if (mainIssue === "both") focus = "mixed";
          setFocusArea(focus);

          // 🔥 INTELLIGENCE SCORE (real signal fusion)
          const confidence = summaryRes.summary?.confidence || 0;
          const dyslexia = summaryRes.scores?.dyslexia_score || 0;
          const dysgraphia = summaryRes.scores?.dysgraphia_score || 0;

          const intelligence = Math.round(
            (1 - (dyslexia + dysgraphia) / 2) * 70 + confidence * 30
          );
          setIntelligenceScore(intelligence);

          // 🔥 AI EXPLANATION (no more list join)
          let explanation = "";

          if (focus === "writing") {
            explanation = "Your motor control and handwriting rhythm are unstable, which is why writing-focused drills are prioritized.";
          } else if (focus === "reading") {
            explanation = "Your eye movement patterns show inefficiency, so reading and fixation training is emphasized.";
          } else if (focus === "mixed") {
            explanation = "Both visual tracking and motor writing signals show inconsistency, so your plan balances both areas.";
          } else {
            explanation = "Your plan is adaptive and adjusts based on incoming cognitive signals.";
          }

          if (insights.length > 0) {
            explanation += ` Key driver: ${insights[0]}`;
          }

          setAiExplanation(explanation);
        }

        // Chart 1: Reading Risk / Speed Trend mapping
        if (progressRes && progressRes.dates) {
          const formattedReading = progressRes.dates.map((date: string, i: number) => ({
            label: `S${i + 1}`,
            speed: Math.round((1 - (progressRes.reading_trend[i] || 0)) * 100)// Lower risk = higher "speed/ability"
          }));
          setReadingData(formattedReading);
        }
        // Chart 2: Rhythm Training Trend mapping
        if (trainingRes && trainingRes.dates) {
          const formattedRhythm = trainingRes.dates.map((date: string, i: number) => ({
            label: `D${i + 1}`,
            score: Math.min(100, Math.round(trainingRes.rhythm_trend[i] || 0))
          }));
          setRhythmData(formattedRhythm);
        }

        // 🔥 REAL STREAK (based on activity days)
        if (trainingRes && trainingRes.dates) {
          setRealStreak(trainingRes.dates.length);
        }

        // Daily Goals Checklist mapping
        if (planRes && planRes.today && planRes.today.exercises) {
          const exercises = [...planRes.today.exercises];

          // Priority: unlocked first, then high XP
          exercises.sort((a: any, b: any) => {
            if (a.locked !== b.locked) return a.locked ? 1 : -1;
            return (b.xp || 0) - (a.xp || 0);
          });

          const mappedGoals = exercises.map((ex: any, i: number) => {
            const weakness = planRes.today.weakness_profile || {};

            let priorityScore = 0;

            if (ex.category === "writing") priorityScore = weakness.writing || 0;
            if (ex.category === "reading") priorityScore = weakness.reading || 0;
            if (ex.category === "rhythm") priorityScore = weakness.rhythm || 0;

            return {
              id: ex.id || i,
              label: ex.name,
              done: ex.status === "done",
              locked: ex.locked,
              xp: ex.xp,
              focus: ex.category,
              priority: priorityScore,
              reason:
                ex.category === "writing"
                  ? `Writing weakness detected (${Math.round(weakness.writing || 0)}%)`
                  : ex.category === "reading"
                  ? `Reading instability detected (${Math.round(weakness.reading || 0)}%)`
                  : ex.category === "rhythm"
                  ? `Rhythm inconsistency (${Math.round(weakness.rhythm || 0)}%)`
                  : "AI adaptive training",
              iconType: ex.type || ex.category || "brain",
            };
          });

          const sortedGoals = mappedGoals.sort((a: any, b: any) => b.priority - a.priority);
          setDailyGoals(sortedGoals);

          // Fallback XP from plan if summary is missing it
          if (xpTotal === 0 && planRes?.xp_today_total) {
            setXpEarned(planRes.today?.xp_earned || 0);
            setXpTotal(planRes.xp_today_total || 0);
          }
        } else {
          setDailyGoals([
            { id: 1, label: "Complete reading assessment", done: false, iconType: "reading" },
            { id: 2, label: "Practice writing patterns", done: false, iconType: "writing" }
          ]);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const completedGoals = dailyGoals.filter((g) => g.done).length;
  const goalProgress =
    dailyGoals.length > 0
      ? (completedGoals / dailyGoals.length) * 100
      : 0;

  if (loading) {
    return (
      <div className="w-full max-w-none px-4 lg:px-8 space-y-6">
        <div className="h-10 bg-secondary rounded w-1/3 mb-6 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              className="h-32 bg-card rounded-2xl border"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
        <motion.div
          className="h-64 bg-card rounded-2xl border"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: 0.6 }}
        />
      </div>
    );
  }

  const confidenceScore = Math.round((data?.summary?.confidence || 0) * 100);
  const streak = realStreak;
  const readingDelta =
    readingData.length > 1
      ? Math.round(
          (readingData[readingData.length - 1].speed || 0) -
            (readingData[0].speed || 0)
        )
      : 0;
  const readingImproving = readingDelta > 0;

  if (!mounted) return null;

  return (
    <motion.div
      className="w-full max-w-7xl mx-auto px-4 lg:px-8 space-y-4 lg:space-y-5"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Insight Highlight */}
      <AnimatePresence>
        {readingData.length > 1 && (
          <motion.div
            key="insight"
            className="bg-primary/10 border border-primary/20 rounded-xl p-4 overflow-hidden"
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 26 }}
          >
            <p className="text-sm font-medium text-primary flex items-center gap-2">
              <Zap className="w-4 h-4 flex-shrink-0" />
              <span>
                Insight: Your reading changed by {readingDelta}% over time. Focus
                on consistency in writing to balance progress.
              </span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Welcome Header */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1
              className="text-3xl lg:text-4xl font-bold text-foreground flex items-center gap-2"
              style={{ fontFamily: "var(--font-fredoka)" }}
            >
              <span>
                Hey {mounted && user?.name ? user.name.split(" ")[0] : "User"}!{" "}
                <motion.span
                  className="inline-flex align-middle text-primary"
                  animate={{ rotate: [0, 18, -8, 18, 0] }}
                  transition={{ duration: 1.4, delay: 0.6, ease: "easeInOut" }}
                  style={{ transformOrigin: "70% 70%" }}
                >
                  <Hand className="w-7 h-7 lg:w-8 lg:h-8" />
                </motion.span>
              </span>
            </h1>
            <p className="text-muted-foreground mt-1">
              {data?.summary?.prediction === "uncertain"
                ? "We need more data. Take another assessment to unlock smarter training."
                : confidenceScore > 80
                ? "You're improving fast. Keep pushing your limits."
                : "Your AI plan is adapting. Stay consistent today."}
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <motion.div whileHover={{ y: -2, scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                onClick={() => setReaderOpen(true)}
                variant="outline"
                className="rounded-xl h-10 px-6 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary font-semibold"
              >
                <FileText className="w-4 h-4 mr-2" />
                Fine View
              </Button>
            </motion.div>
            <Link href="/assessment">
              <motion.div whileHover={{ y: -2, scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button className="rounded-xl h-10 px-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 font-bold">
                  <Target className="w-4 h-4 mr-2" />
                  Start Assessment
                </Button>
              </motion.div>
            </Link>
            <Link href="/training">
              <motion.div whileHover={{ y: -2, scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button
                  variant="outline"
                  className="rounded-xl h-10 px-6 border-border hover:bg-secondary hover:border-primary/30 font-semibold"
                >
                  <GraduationCap className="w-4 h-4 mr-2" />
                  Training Plan
                </Button>
              </motion.div>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Status Cards Row */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6"
        variants={containerVariants}
      >
        {/* Level Card */}
        <motion.div
          variants={itemVariants}
          {...cardHover}
          className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm hover:shadow-lg"
        >
          <div className="flex items-start justify-between mb-4">
            <motion.div
              whileHover={{ rotate: -8, scale: 1.1 }}
              className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"
            >
              <Target className="w-5 h-5 text-primary" />
            </motion.div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold uppercase tracking-wider">
              {data?.severity?.dyslexia?.replace("_", " ") || "UNRATED"}
            </span>
          </div>
          <h3 className="text-sm text-muted-foreground mb-1">Dyslexia Risk Level</h3>
          <p className="text-lg font-bold text-foreground capitalize">
            {data?.severity?.dyslexia?.replace("_", " ") || "No Data"}
          </p>
        </motion.div>

        {/* Confidence Card */}
        <motion.div
          variants={itemVariants}
          {...cardHover}
          className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm hover:shadow-lg"
        >
          <div className="flex items-start justify-between mb-4">
            <motion.div
              whileHover={{ rotate: 8, scale: 1.1 }}
              className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"
            >
              <Star className="w-5 h-5 text-blue-500" />
            </motion.div>
            <AnimatedNumber
              value={confidenceScore}
              suffix="%"
              className="text-2xl font-bold text-foreground"
            />
          </div>
          <h3 className="text-sm text-muted-foreground mb-1">AI Accuracy</h3>
          <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
            <MotionBar value={confidenceScore} className="bg-blue-500 h-2 rounded-full" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{getLabel(confidenceScore)}</p>
        </motion.div>

        {/* Cognitive Index Card */}
        <motion.div
          variants={itemVariants}
          {...cardHover}
          className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm hover:shadow-lg"
        >
          <div className="flex items-start justify-between mb-4">
            <motion.div
              whileHover={{ rotate: -8, scale: 1.1 }}
              className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center"
            >
              <TrendingUp className="w-5 h-5 text-green-500" />
            </motion.div>
            {readingImproving && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
                className="inline-flex items-center gap-1 text-green-600 text-xs font-medium bg-green-50 px-2 py-1 rounded-md"
              >
                <TrendingUp className="w-3 h-3" /> Improving
              </motion.span>
            )}
          </div>
          <h3 className="text-sm text-muted-foreground mb-1">Overall Learning Score</h3>
          <p className="text-lg font-bold text-foreground">
            {intelligenceScore > 0 ? (
              <>
                {getLabel(intelligenceScore)} (
                <AnimatedNumber value={intelligenceScore} />
                /100)
              </>
            ) : (
              "Pending"
            )}
          </p>
        </motion.div>

        {/* Streak Card */}
        <motion.div
          variants={itemVariants}
          {...cardHover}
          className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm hover:shadow-lg"
        >
          <div className="flex items-start justify-between mb-4">
            <motion.div
              animate={
                streak > 0
                  ? { scale: [1, 1.15, 1], rotate: [0, -6, 6, 0] }
                  : {}
              }
              transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1.5 }}
              className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"
            >
              <Zap className="w-5 h-5 text-amber-500" />
            </motion.div>
          </div>
          <h3 className="text-sm text-muted-foreground mb-1">Active Day Streak</h3>
          <p className="text-lg font-bold text-foreground flex items-center gap-2">
            {streak > 0 ? (
              <>
                <AnimatedNumber value={streak} /> Days
                <Flame className="w-4 h-4 text-amber-500" />
              </>
            ) : (
              "0 Days"
            )}
          </p>
        </motion.div>
      </motion.div>

      {/* Charts + Daily Goals Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Reading Ability Chart */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-2 bg-card rounded-2xl border border-border/50 p-5 shadow-sm h-fit"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground">Reading Improvement</h3>
                {readingData.length > 1 && (
                  <span
                    className={cn(
                      "text-xs px-2 py-1 rounded-md",
                      readingImproving
                        ? "bg-green-50 text-green-600"
                        : "bg-red-50 text-red-600"
                    )}
                  >
                    {readingImproving ? "Improving" : "Needs focus"}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Shows how your reading is improving over time
              </p>
            </div>
            <Link href="/progress">
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary rounded-lg group"
              >
                View All
                <ArrowRight className="w-3 h-3 ml-1 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
          <motion.div
            className="h-60 flex items-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
          >
            {readingData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={readingData}>
                  <defs>
                    <linearGradient id="readingGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.72 0.18 45)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.72 0.18 45)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.02 60)" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="oklch(0.5 0.03 45)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="oklch(0.5 0.03 45)" domain={[0, 100]} />
                  <Tooltip
                    formatter={(value: number) => [`${Math.round(value)} / 100`, "Score"]}
                    contentStyle={{
                      background: "oklch(1 0 0)",
                      border: "1px solid oklch(0.92 0.02 60)",
                      borderRadius: "12px",
                      fontSize: "13px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="speed"
                    name="Fluency"
                    stroke="oklch(0.72 0.18 45)"
                    strokeWidth={3}
                    fill="url(#readingGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground border-2 border-dashed border-border rounded-xl py-10">
                <Rocket className="w-4 h-4 text-primary" />
                Start your first test to unlock your progress dashboard
              </div>
            )}
          </motion.div>
        </motion.div>

        {/* Daily Goals */}
        <motion.div
          variants={itemVariants}
          className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm flex flex-col h-full min-h-[600px]"
        >
          {/* Focus tags above title */}
          {dailyGoals.length > 0 && (
            <div className="mb-3 flex gap-2 flex-wrap">
              {[focusArea].map((f, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-xs px-2 py-1 rounded-full bg-accent/20 text-accent-foreground"
                >
                  Focus: {f}
                </motion.span>
              ))}
            </div>
          )}
          <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-primary" />
            Daily AI Plan
          </h3>
          <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
            <ArrowRight className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span>
              Start with:{" "}
              <span className="font-semibold text-primary">
                {dailyGoals[0]?.label || "your first task"}
              </span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Personalized tasks based on your cognitive weaknesses (reading, writing, rhythm)
          </p>

          {/* Progress Ring */}
          <div className="flex justify-center mb-3">
            <div className="relative">
              <ProgressRing value={goalProgress} size={100} strokeWidth={8} />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.span
                  key={`${completedGoals}-${dailyGoals.length}`}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="text-xl font-bold text-foreground"
                >
                  {completedGoals}/{dailyGoals.length}
                </motion.span>
              </div>
            </div>
          </div>
          <div className="text-center text-xs text-muted-foreground mb-3">
            XP Today:{" "}
            <span className="font-semibold text-yellow-600">
              <AnimatedNumber value={xpEarned} />/{xpTotal}
            </span>
          </div>

          {/* Sticky Start Task */}
          {dailyGoals.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mb-3 p-3 rounded-xl bg-primary/10 border border-primary/20 sticky top-0 z-10"
            >
              <p className="text-xs text-muted-foreground mb-1">Start here</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-primary">
                  {dailyGoals[0].label}
                </span>
                <Link href="/training">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button size="sm" className="rounded-lg px-3 py-1 text-xs">
                      Start →
                    </Button>
                  </motion.div>
                </Link>
              </div>
            </motion.div>
          )}

          {/* Goal Checklist */}
          <motion.div
            className="space-y-2 overflow-y-auto pr-2 flex-1 max-h-[260px] scrollbar-thin scrollbar-thumb-primary/40 scrollbar-track-transparent"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence initial={false}>
              {dailyGoals.map((goal) => (
                <motion.div
                  key={goal.id}
                  layout
                  variants={goalVariants}
                  exit="exit"
                  whileHover={goal.locked ? undefined : { x: 4 }}
                  className={cn(
                    "flex flex-col gap-1 p-3 rounded-xl border",
                    goal.locked
                      ? "opacity-50 bg-muted"
                      : goal.done
                      ? "bg-green-50/50"
                      : "bg-secondary/30 hover:bg-secondary/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                        goal.done ? "bg-green-100 text-green-600" : "bg-primary/10 text-primary"
                      )}
                    >
                      <GoalIcon name={goal.iconType} className="w-4 h-4" />
                    </span>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-sm font-medium",
                            goal.done ? "text-green-600 font-semibold" : "text-foreground"
                          )}
                        >
                          {goal.label}
                        </span>

                        {goal.focus && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {goal.focus}
                          </span>
                        )}

                        {"priority" in goal && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                            Impact {Math.round((goal as any).priority)}%
                          </span>
                        )}
                      </div>

                      {goal.reason && (
                        <p className="text-xs text-muted-foreground">{goal.reason}</p>
                      )}
                    </div>

                    {goal.xp && (
                      <span className="text-xs font-semibold text-yellow-600">
                        +{goal.xp} XP
                      </span>
                    )}

                    {goal.done && (
                      <motion.div
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 18 }}
                      >
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      </motion.div>
                    )}

                    {/* CTA on first task */}
                    {!goal.done && !goal.locked && goal.id === dailyGoals[0].id && (
                      <Link href="/training">
                        <motion.span
                          animate={{ x: [0, 3, 0] }}
                          transition={{ duration: 1.2, repeat: Infinity }}
                          className="text-[10px] text-primary font-semibold ml-2 cursor-pointer"
                        >
                          Tap to start →
                        </motion.span>
                      </Link>
                    )}
                  </div>

                  {/* Task Progress Bar */}
                  <div className="ml-7 mt-1">
                    <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                      <MotionBar
                        value={goal.done ? 100 : 40}
                        className={cn(
                          "h-full rounded-full",
                          goal.done ? "bg-green-500" : "bg-primary"
                        )}
                      />
                    </div>
                  </div>

                  {goal.locked && (
                    <span className="text-[10px] text-muted-foreground ml-7 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Complete previous tasks to unlock
                    </span>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          <Link href="/training" className="mt-3 block">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                className="w-full rounded-xl mt-2 text-primary hover:text-primary"
              >
                View Full Plan
              </Button>
            </motion.div>
          </Link>

          {/* AI Insight panel */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-4 p-3 rounded-xl bg-muted/40 border text-xs text-muted-foreground flex items-start gap-2"
          >
            <Brain className="w-4 h-4 flex-shrink-0 mt-0.5 text-primary" />
            <span>
              What this means:{" "}
              {aiExplanation || "Adaptive model is analyzing your cognitive signals."}
            </span>
          </motion.div>
        </motion.div>
      </div>

      {/* Rhythm Score Chart */}
      <motion.div
        variants={itemVariants}
        className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm w-full max-w-none"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <PenTool className="w-4 h-4 text-accent-foreground" />
              Writing Consistency
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              How steady and smooth your writing is
            </p>
          </div>
        </div>
        <motion.div
          className="h-56 max-w-full"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
        >
          {rhythmData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rhythmData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.02 60)" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="oklch(0.5 0.03 45)" />
                <YAxis tick={{ fontSize: 12 }} stroke="oklch(0.5 0.03 45)" domain={[0, 100]} />
                <Tooltip
                  formatter={(value: number) => [`${Math.round(value)} / 100`, "Score"]}
                  contentStyle={{
                    background: "oklch(1 0 0)",
                    border: "1px solid oklch(0.92 0.02 60)",
                    borderRadius: "12px",
                    fontSize: "13px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  name="Rhythm"
                  stroke="oklch(0.85 0.14 70)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "oklch(0.85 0.14 70)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground border-2 border-dashed border-border rounded-xl">
              Complete training exercises to build this chart.
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        variants={containerVariants}
      >
        <motion.div variants={itemVariants} className="sm:col-span-2 h-full">
          <Link href="/assessment" className="group block h-full">
            <motion.div
              whileHover={{ y: -6 }}
              whileTap={{ scale: 0.99 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="h-full flex flex-col justify-center bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 rounded-2xl border border-border/50 p-6 text-center hover:border-primary/40"
            >
              <motion.div
                whileHover={{ scale: 1.12, rotate: 6 }}
                className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-4"
              >
                <Target className="w-8 h-8 text-primary" />
              </motion.div>
              <h3 className="text-xl font-bold text-foreground mb-1">
                AI Diagnostic Assessment
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Complete the unified reading and writing assessment for a full cognitive
                analysis.
              </p>
            </motion.div>
          </Link>
        </motion.div>
        <motion.div variants={itemVariants} className="h-full">
          <Link href="/training" className="group block h-full">
            <motion.div
              whileHover={{ y: -6 }}
              whileTap={{ scale: 0.99 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="h-full flex flex-col justify-center bg-gradient-to-br from-blue-50 to-primary/5 rounded-2xl border border-border/50 p-6 text-center hover:border-blue-200"
            >
              <motion.div
                whileHover={{ scale: 1.12, rotate: -6 }}
                className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-3"
              >
                <GraduationCap className="w-7 h-7 text-blue-600" />
              </motion.div>
              <h3 className="font-semibold text-foreground mb-1">Training Plan</h3>
              <p className="text-xs text-muted-foreground">Continue personalized exercises</p>
            </motion.div>
          </Link>
        </motion.div>
      </motion.div>

      {/* 📄 Dyslexia-friendly PDF reader modal */}
      <AnimatePresence>
        {readerOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setReaderOpen(false)}
          >
            <motion.div
              className="bg-card w-full max-w-3xl max-h-[85vh] rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden"
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">Fine View</h3>
                    <p className="text-xs text-muted-foreground">
                      Upload a PDF — we extract the text and show it in a dyslexia-friendly format
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setReaderOpen(false)}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={pdfLoading}
                  className="w-full border-2 border-dashed border-border rounded-xl py-8 flex flex-col items-center justify-center gap-2 hover:border-primary/40 hover:bg-secondary/30 transition-all disabled:opacity-60"
                >
                  {pdfLoading ? (
                    <>
                      <Loader2 className="w-7 h-7 text-primary animate-spin" />
                      <span className="text-sm text-muted-foreground">
                        Scanning {pdfName ?? "PDF"}…
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-7 h-7 text-primary" />
                      <span className="text-sm font-medium text-foreground">
                        {pdfName ? "Choose a different PDF" : "Click to upload a PDF"}
                      </span>
                      <span className="text-xs text-muted-foreground">Max 15 MB</span>
                    </>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={handlePdfUpload}
                />

                {pdfError && (
                  <p className="mt-3 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                    {pdfError}
                  </p>
                )}

                {pdfText !== null && !pdfLoading && (
                  <div className="mt-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Extracted text — easy read
                      </p>
                      <span className="text-xs text-muted-foreground">{pdfText.length} chars</span>
                    </div>
                    <div
                      className="rounded-xl border border-border bg-[#fffdf7] p-5 text-foreground whitespace-pre-wrap"
                      style={{
                        fontFamily: "Arial, Helvetica, sans-serif",
                        fontWeight: 700,
                        fontSize: "1.05rem",
                        lineHeight: 2.2,
                        letterSpacing: "0.18em",
                        wordSpacing: "0.5em",
                      }}
                    >
                      {pdfText || "No readable text found."}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
