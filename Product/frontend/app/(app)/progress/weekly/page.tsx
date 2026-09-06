"use client";

import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { useElementInView } from "@/hooks/use-scroll-progress";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Activity, ArrowLeft, ArrowRight, Sparkles, Eye, PenTool, Loader2, Calendar, ChevronLeft } from "lucide-react";
import { api } from "@/lib/api";
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
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";

const chartTooltipStyle = {
  background: "oklch(1 0 0)",
  border: "1px solid oklch(0.92 0.02 60)",
  borderRadius: "12px",
  fontSize: "13px",
};

export default function WeeklyProgressPage() {
  const ref = useRef<HTMLDivElement>(null);
  const { hasBeenInView } = useElementInView(ref, { threshold: 0.1 });
  const [selectedWeek, setSelectedWeek] = useState(0); 
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [summary, graph, training] = await Promise.all([
          api.get("/dashboard/summary"),
          api.get("/dashboard/progress-graph"),
          api.get("/dashboard/training-progress")
        ]);

        // 🔥 WEEK GROUPING LOGIC
        const rawDates = graph.dates || [];
        const firstDate = rawDates.length > 0 ? new Date(rawDates[0]) : new Date();
        
        const groupedTrendData: any[] = [];
        rawDates.forEach((d: string, i: number) => {
          const currentDate = new Date(d);
          const diffInMs = currentDate.getTime() - firstDate.getTime();
          const weekNum = Math.floor(diffInMs / (7 * 24 * 60 * 60 * 1000));
          
          if (!groupedTrendData[weekNum]) {
            groupedTrendData[weekNum] = {
              week: `W${weekNum + 1}`,
              readingScores: [],
              writingScores: [],
              confidenceScores: [],
              date: d
            };
          }
          groupedTrendData[weekNum].readingScores.push((1 - (graph.reading_trend?.[i] || 0)) * 100);
          groupedTrendData[weekNum].writingScores.push((1 - (graph.writing_trend?.[i] || 0)) * 100);
          groupedTrendData[weekNum].confidenceScores.push((graph.confidence_trend?.[i] || 0) * 100);
        });

        const trendData = groupedTrendData.filter(Boolean).map((w, idx) => ({
          week: w.week,
          reading: Math.round(w.readingScores.reduce((a: number, b: number) => a + b, 0) / w.readingScores.length),
          writing: Math.round(w.writingScores.reduce((a: number, b: number) => a + b, 0) / w.writingScores.length),
          confidence: Math.round(w.confidenceScores.reduce((a: number, b: number) => a + b, 0) / w.confidenceScores.length),
          date: w.date
        }));

        // 🔥 XP TREND (CUMULATIVE)
        const weekXpTrend: any[] = [];
        (training.dates || []).forEach((date: string, i: number) => {
          const currentDate = new Date(date);
          const diffInMs = currentDate.getTime() - firstDate.getTime();
          const weekNum = Math.floor(diffInMs / (7 * 24 * 60 * 60 * 1000));
          const weekLabel = `W${weekNum + 1}`;
          
          weekXpTrend[weekNum] = {
            week: weekLabel,
            overall: training.overall_trend?.[i] || 0
          };
        });
        const finalWeekXpTrend = weekXpTrend.filter(Boolean);

        // Radar Data
        const radarData = [
          { subject: 'Reading', A: Math.max(0, 100 - ((summary.weakness_profile?.reading || 0) * 100)), fullMark: 100 },
          { subject: 'Writing', A: Math.max(0, 100 - ((summary.weakness_profile?.writing || 0) * 100)), fullMark: 100 },
          { subject: 'Rhythm', A: Math.max(0, 100 - ((summary.weakness_profile?.rhythm || 0) * 100)), fullMark: 100 },
          { subject: 'Focus', A: Math.max(0, 100 - (summary.summary?.uncertainty_score * 100 || 0)), fullMark: 100 },
          { subject: 'Smoothness', A: Math.max(0, 100 - (summary.advanced_metrics?.avg_jerk * 10 || 0)), fullMark: 100 },
        ];

        setData({
          summary,
          trendData,
          weekXpTrend: finalWeekXpTrend,
          radarData,
          streak: training.streak || 0
        });
        
        if (trendData.length > 0) {
          setSelectedWeek(trendData.length - 1);
        }
      } catch (err: any) {
        console.error("Progress data error:", err);
        setError(err.message || "Failed to load progress data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted-foreground animate-pulse">Generating your weekly mastery report...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-20 bg-card rounded-3xl border border-destructive/20 max-w-2xl mx-auto">
        <p className="text-destructive font-medium mb-4">{error || "No progress data found"}</p>
        <Button onClick={() => window.location.reload()} variant="outline">Try Again</Button>
      </div>
    );
  }

  const { trendData, weekXpTrend, radarData, summary, streak } = data;
  const currentStats = trendData[selectedWeek] || {};
  const readingImprovement = currentStats.reading - trendData[0]?.reading || 0;
  const writingImprovement = currentStats.writing - trendData[0]?.writing || 0;
  const confidenceImprovement = currentStats.confidence - trendData[0]?.confidence || 0;
  const avgJerk = summary.advanced_metrics?.avg_jerk || 0;

  return (
    <div ref={ref} className="max-w-5xl mx-auto space-y-6 px-4 pb-20">
      {/* Header */}
      <div className="animate-fade-in-up">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pt-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3"
              style={{ fontFamily: "var(--font-fredoka)" }}>
              <Calendar className="w-7 h-7 text-primary" />
              Weekly Mastery Report
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">Long-term performance trends across {trendData.length} weeks</p>
          </div>
          
          <div className="flex items-center gap-3 bg-secondary/20 p-1.5 rounded-2xl border border-border/40 self-start md:self-center">
            <div className="flex bg-white/40 rounded-xl p-0.5 border border-border/10 shadow-sm">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => window.location.href = '/progress'}
                className="rounded-lg text-xs h-8 px-5 font-semibold transition-all">
                Day
              </Button>
              <Button 
                variant="secondary" 
                size="sm"
                className="rounded-lg text-xs h-8 px-5 font-semibold transition-all shadow-sm bg-white">
                Week
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Week Selector */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 shadow-sm flex items-center justify-between opacity-0 animate-fade-in-up mb-6"
        style={{ animationDelay: "200ms" }}>
        <Button variant="ghost" size="sm" className="rounded-lg shrink-0"
          disabled={selectedWeek === 0}
          onClick={() => setSelectedWeek(Math.max(0, selectedWeek - 1))}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Previous
        </Button>
        <div className="flex items-center gap-2 overflow-x-auto px-4 py-1 no-scrollbar mask-fade-edges">
          {trendData.map((_: any, i: number) => (
            <button key={i}
              onClick={() => setSelectedWeek(i)}
              className={cn(
                "w-10 h-10 shrink-0 rounded-xl text-xs font-bold transition-all",
                i === selectedWeek
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-110"
                  : "bg-primary/10 text-primary hover:bg-primary/20"
              )}>
              W{i + 1}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="rounded-lg shrink-0"
          disabled={selectedWeek === trendData.length - 1}
          onClick={() => setSelectedWeek(Math.min(trendData.length - 1, selectedWeek + 1))}>
          Next <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-children">
        <div className="card-3d bg-card rounded-2xl border border-border/50 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Eye className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Reading Progress</p>
              <div className="text-2xl font-bold text-foreground">
                {Math.round(currentStats.reading || 0)}%
              </div>
            </div>
          </div>
          <div className={cn("flex items-center gap-1 text-xs font-medium", readingImprovement >= 0 ? "text-green-600" : "text-amber-600")}>
            {readingImprovement >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(Math.round(readingImprovement))}% change
          </div>
        </div>

        <div className="card-3d bg-card rounded-2xl border border-border/50 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Writing Progress</p>
              <div className="text-2xl font-bold text-foreground">
                {Math.round(currentStats.writing || 0)}%
              </div>
            </div>
          </div>
          <div className={cn("flex items-center gap-1 text-xs font-medium", writingImprovement >= 0 ? "text-green-600" : "text-amber-600")}>
            {writingImprovement >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(Math.round(writingImprovement))}% improvement
          </div>
        </div>

        <div className="card-3d bg-card rounded-2xl border border-border/50 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">AI Confidence</p>
              <div className="text-2xl font-bold text-foreground">
                {Math.round(currentStats.confidence || 0)}%
              </div>
            </div>
          </div>
          <div className={cn("flex items-center gap-1 text-xs font-medium text-green-600")}>
            <TrendingUp className="w-3 h-3" /> High reliability
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Radar Map */}
        <div className="lg:col-span-2 bg-card rounded-3xl border border-border/50 p-6 shadow-sm opacity-0 animate-fade-in-up" 
          style={{ animationDelay: "400ms" }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Weekly Focus Map
              </h3>
              <p className="text-xs text-muted-foreground">Cumulative cognitive balance for selected week</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="oklch(0.92 0.02 60)" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: "oklch(0.5 0.03 45)" }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Tooltip formatter={(value: number) => [Math.round(value), 'Status']} />
                <Radar name="Performance" dataKey="A" stroke="oklch(0.72 0.18 45)" fill="oklch(0.72 0.18 45)" fillOpacity={0.6} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Smoothness & Weekly Goal */}
        <div className="space-y-4">
          <div className="bg-card rounded-3xl border border-border/50 p-5 shadow-sm">
            <h3 className="font-semibold text-sm text-foreground mb-4">Motor Consistency</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground lowercase">Stroke Stability</span>
                  <span className="font-bold">{Math.round(100 - (avgJerk * 10))}%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${Math.round(100 - (avgJerk * 10))}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground lowercase">Rhythm Timing</span>
                  <span className="font-bold">{Math.round(summary.weakness_profile?.rhythm * 100 || 0)}%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${Math.round(summary.weakness_profile?.rhythm * 100 || 0)}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-primary/5 rounded-3xl border border-primary/20 p-5 text-center">
            <h3 className="font-semibold text-sm text-primary mb-2">Weekly Goal Progress</h3>
            <p className="text-3xl font-bold text-foreground mb-1">{summary.summary?.weekly_exercises || 0} / {summary.summary?.weekly_goal || 28}</p>
            <p className="text-xs text-muted-foreground">{summary.summary?.weekly_exercises >= (summary.summary?.weekly_goal || 28) ? "Weekly exercise target reached!" : `Complete ${(summary.summary?.weekly_goal || 28) - (summary.summary?.weekly_exercises || 0)} more sessions this week`}</p>
            <div className="mt-4 flex justify-center gap-1">
               {[1,2,3,4,5,6,7].map(d => (
                 <div key={d} className="w-2 h-2 rounded-full bg-primary" />
               ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Weekly Trend */}
      <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm opacity-0 animate-fade-in-up"
        style={{ animationDelay: "600ms" }}>
        <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" /> Cumulative Growth (XP)
        </h3>
        <p className="text-xs text-muted-foreground mb-4">Your total effort points across sessions</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weekXpTrend}>
              <defs>
                <linearGradient id="xpGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.72 0.18 45)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="oklch(0.72 0.18 45)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.02 60)" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(val: any) => [Math.round(val), "Total XP"]} />
              <Area type="monotone" dataKey="overall" stroke="oklch(0.72 0.18 45)" strokeWidth={3} fill="url(#xpGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
