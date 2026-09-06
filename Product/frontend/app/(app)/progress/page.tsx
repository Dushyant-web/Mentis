"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useElementInView } from "@/hooks/use-scroll-progress";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import {
  TrendingUp, TrendingDown, Minus, BarChart3, Activity, Star,
  Brain, Calendar, Target, X, AlertTriangle, CheckCircle, FileText,
  Download, Zap, Award, ArrowUpRight, ArrowDownRight, Clock, Eye,
  PenTool, ChevronDown, ChevronUp, BookOpen
} from "lucide-react";

// =====================
// CANVAS CHART HELPERS
// =====================

function drawLineChart(
  canvas: HTMLCanvasElement,
  history: any[],
  keys: { key: string; color: string; label: string }[]
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.offsetWidth;
  const h = canvas.offsetHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const pad = { top: 32, right: 16, bottom: 28, left: 38 };
  const cw = w - pad.left - pad.right;
  const ch = h - pad.top - pad.bottom;

  // Grid
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (ch / 4) * i;
    ctx.strokeStyle = "#f3f4f6";
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
    ctx.fillStyle = "#aaa";
    ctx.font = "10px Inter, system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${100 - i * 25}%`, pad.left - 6, y + 3);
  }

  if (history.length < 2) {
    ctx.fillStyle = "#999";
    ctx.font = "13px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Take 2+ assessments to see your risk trend", w / 2, h / 2);
    return;
  }

  keys.forEach(({ key, color }) => {
    const values = history.map((h: any) => h[key] || 0);
    // Area fill
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + ch);
    grad.addColorStop(0, color + "22"); grad.addColorStop(1, color + "02");
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = pad.left + (cw / (values.length - 1)) * i;
      const y = pad.top + ch - (v / 100) * ch;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(pad.left + cw, pad.top + ch);
    ctx.lineTo(pad.left, pad.top + ch);
    ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
    // Line
    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin = "round"; ctx.lineCap = "round";
    values.forEach((v, i) => {
      const x = pad.left + (cw / (values.length - 1)) * i;
      const y = pad.top + ch - (v / 100) * ch;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    // Dots
    values.forEach((v, i) => {
      const x = pad.left + (cw / (values.length - 1)) * i;
      const y = pad.top + ch - (v / 100) * ch;
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
    });
  });

  // X labels
  history.forEach((_h: any, i: number) => {
    if (history.length > 8 && i % 2 !== 0 && i !== history.length - 1) return;
    const x = pad.left + (cw / (history.length - 1)) * i;
    ctx.fillStyle = "#999"; ctx.font = "9px Inter, system-ui, sans-serif"; ctx.textAlign = "center";
    const d = _h.date ? new Date(_h.date) : null;
    const label = d ? `${d.getDate()} ${d.toLocaleString("en", { month: "short" })}` : `Test ${i + 1}`;
    ctx.fillText(label, x, pad.top + ch + 16);
  });

  // Legend
  keys.forEach((k, i) => {
    const x = pad.left + i * (cw / keys.length);
    ctx.fillStyle = k.color;
    ctx.beginPath(); ctx.arc(x + 6, 12, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#555"; ctx.font = "10px Inter, system-ui, sans-serif"; ctx.textAlign = "left";
    ctx.fillText(k.label, x + 14, 15);
  });
}

function drawDonutChart(canvas: HTMLCanvasElement, slices: { value: number; color: string; label: string }[]) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const size = canvas.offsetWidth;
  canvas.width = size * dpr; canvas.height = size * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, size, size);

  const cx = size / 2, cy = size / 2, r = size / 2 - 16;
  const total = slices.reduce((s, sl) => s + Math.max(sl.value, 0), 0);
  if (total === 0) return;

  let angle = -Math.PI / 2;
  slices.forEach(sl => {
    if (sl.value <= 0) return;
    const sweep = (sl.value / total) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, angle + sweep);
    ctx.closePath(); ctx.fillStyle = sl.color; ctx.fill();
    // Label %
    if (sl.value / total > 0.08) {
      const mid = angle + sweep / 2;
      const lx = cx + (r * 0.7) * Math.cos(mid);
      const ly = cy + (r * 0.7) * Math.sin(mid);
      ctx.fillStyle = "#fff"; ctx.font = "bold 11px Inter, system-ui, sans-serif"; ctx.textAlign = "center";
      ctx.fillText(`${Math.round(sl.value)}%`, lx, ly + 4);
    }
    angle += sweep;
  });

  // Donut hole
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
  ctx.fillStyle = "#fff"; ctx.fill();
}

function drawGauge(canvas: HTMLCanvasElement, value: number, color: string, label: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const size = canvas.offsetWidth;
  canvas.width = size * dpr; canvas.height = (size * 0.6) * dpr;
  ctx.scale(dpr, dpr);
  const w = size, h = size * 0.6;
  ctx.clearRect(0, 0, w, h);

  const cx = w / 2, cy = h - 6, r = Math.min(w, h) * 0.65;
  // BG arc
  ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 0);
  ctx.lineWidth = 14; ctx.strokeStyle = "#f3f4f6"; ctx.lineCap = "round"; ctx.stroke();
  // Value arc
  const pct = Math.min(value, 100) / 100;
  if (pct > 0) {
    ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, Math.PI + Math.PI * pct);
    ctx.lineWidth = 14; ctx.strokeStyle = color; ctx.lineCap = "round"; ctx.stroke();
  }
  // Value
  ctx.fillStyle = "#1a1a1a"; ctx.font = "bold 24px Inter, system-ui, sans-serif"; ctx.textAlign = "center";
  ctx.fillText(`${Math.round(value)}%`, cx, cy - 10);
  ctx.fillStyle = "#999"; ctx.font = "10px Inter, system-ui, sans-serif";
  ctx.fillText(label, cx, cy + 6);
}

// =====================
// HELPERS
// =====================
const levelLabel = (lvl: string) => {
  const map: Record<string, string> = {
    mild: "Mild", moderate: "Moderate", severe: "Severe", normal: "Normal",
    stage_1: "Mild", stage_2: "Moderate", stage_3: "Severe",
    dyslexia: "Dyslexia", dysgraphia: "Dysgraphia", both: "Both",
  };
  return map[lvl?.toLowerCase()] || lvl || "Normal";
};

const levelColor = (lvl: string) => {
  const l = (lvl || "").toLowerCase();
  if (l.includes("severe") || l === "stage_3") return "text-red-600 bg-red-50 border-red-200";
  if (l.includes("moderate") || l === "stage_2") return "text-orange-600 bg-orange-50 border-orange-200";
  if (l.includes("mild") || l === "stage_1" || l === "dyslexia") return "text-blue-600 bg-blue-50 border-blue-200";
  return "text-green-600 bg-green-50 border-green-200";
};

const riskLabel = (score: number) => {
  if (score >= 60) return "High";
  if (score >= 30) return "Moderate";
  if (score >= 10) return "Low";
  return "Minimal";
};

// =====================
// MAIN PAGE
// =====================
export default function ProgressPage() {
  const ref = useRef<HTMLDivElement>(null);
  const { hasBeenInView } = useElementInView(ref, { threshold: 0.1 });

  const [progressData, setProgressData] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [improvementData, setImprovementData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState(false);

  const trendChartRef = useRef<HTMLCanvasElement>(null);
  const pieChartRef = useRef<HTMLCanvasElement>(null);
  const gaugeReading = useRef<HTMLCanvasElement>(null);
  const gaugeWriting = useRef<HTMLCanvasElement>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [progressRes, analyticsRes, improvementRes] = await Promise.allSettled([
          api.get("/reports/progress-history"),
          api.get("/assessment/analytics"),
          api.get("/dashboard/improvement"),
        ]);
        if (progressRes.status === "fulfilled") setProgressData(progressRes.value);
        if (analyticsRes.status === "fulfilled") setAnalyticsData(analyticsRes.value);
        if (improvementRes.status === "fulfilled") setImprovementData(improvementRes.value);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  // Draw charts when data loads — defer to next frame for DOM layout
  useEffect(() => {
    if (!progressData?.history?.length) return;
    
    const drawAllCharts = () => {
      const history = progressData.history;
      const latest = history[history.length - 1];

      if (trendChartRef.current && trendChartRef.current.offsetWidth > 0) {
        drawLineChart(trendChartRef.current, history, [
          { key: "dyslexia_score", color: "#ef4444", label: "Reading Risk" },
          { key: "dysgraphia_score", color: "#f59e0b", label: "Writing Risk" },
          { key: "normal_score", color: "#22c55e", label: "Normal" },
        ]);
      }

      if (pieChartRef.current && pieChartRef.current.offsetWidth > 0 && latest) {
        drawDonutChart(pieChartRef.current, [
          { value: latest.dyslexia_score, color: "#ef4444", label: "Reading" },
          { value: latest.dysgraphia_score, color: "#f59e0b", label: "Writing" },
          { value: latest.normal_score, color: "#22c55e", label: "Normal" },
        ]);
      }

      if (gaugeReading.current && gaugeReading.current.offsetWidth > 0) {
        drawGauge(gaugeReading.current, latest?.dyslexia_score || 0, "#ef4444", "Reading Risk");
      }
      if (gaugeWriting.current && gaugeWriting.current.offsetWidth > 0) {
        drawGauge(gaugeWriting.current, latest?.dysgraphia_score || 0, "#f59e0b", "Writing Risk");
      }
    };

    // Wait for next animation frame + small timeout to ensure CSS layout is done
    const raf = requestAnimationFrame(() => {
      setTimeout(drawAllCharts, 50);
    });

    // Also re-draw on window resize
    const handleResize = () => drawAllCharts();
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
    };
  }, [progressData]);

  // Open report in modal
  const openReport = async (session: any) => {
    setReportLoading(true);
    setSelectedReport({ session_number: session.session_number });
    try {
      if (session.session_id) {
        const json = await api.get(`/reports/diagnostic/${session.session_id}`);
        if (json.report) {
          setSelectedReport({ ...json.report, session_number: session.session_number });
          setReportLoading(false);
          return;
        }
      }
    } catch {}
    // Fallback to inline data
    setSelectedReport({
      prediction: session.prediction, level: session.level, stage: session.stage,
      confidence: session.confidence, dyslexia_score: session.dyslexia_score,
      dysgraphia_score: session.dysgraphia_score, normal_score: session.normal_score,
      date: session.date, session_number: session.session_number,
    });
    setReportLoading(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground">
      <Clock className="w-5 h-5 animate-spin mr-2" /> Loading your progress...
    </div>
  );

  const history = progressData?.history || [];
  const improvement = progressData?.improvement;
  const stats = progressData?.training_stats || {};
  const latest = history.length > 0 ? history[history.length - 1] : null;
  const previous = history.length > 1 ? history[history.length - 2] : null;
  const visibleHistory = expandedHistory ? history : history.slice(-4);

  return (
    <div ref={ref} className="max-w-5xl mx-auto space-y-5 pb-10">
      {/* Header */}
      <div className={cn("opacity-0 flex items-start justify-between flex-wrap gap-4", hasBeenInView && "animate-fade-in-up")}>
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-fredoka)" }}>
            Your Progress
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">See how your scores change over time</p>
        </div>
        <Button 
          onClick={() => window.location.href = '/reports/full'}
          className="rounded-xl px-5 bg-foreground text-background hover:bg-foreground/90 shadow-sm transition-all hover:shadow-md hidden sm:flex"
        >
          <BookOpen className="w-4 h-4 mr-2" /> Full Medical Report
        </Button>
      </div>

      {/* ===== STATS ROW ===== */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { icon: <Calendar className="w-4.5 h-4.5 text-blue-500" />, value: history.length, label: "Tests Taken" },
          { icon: <Activity className="w-4.5 h-4.5 text-green-500" />, value: stats.exercises_completed || 0, label: "Exercises Done" },
          { icon: <Zap className="w-4.5 h-4.5 text-amber-500" />, value: stats.total_xp_earned || 0, label: "Total XP" },
          { icon: <Award className="w-4.5 h-4.5 text-violet-500" />, value: analyticsData?.average_confidence ? `${Math.round(analyticsData.average_confidence * 100)}%` : "—", label: "Avg Confidence" },
          {
            icon: improvement?.trending === "improving" || improvementData?.status === "improving"
              ? <ArrowDownRight className="w-4.5 h-4.5 text-green-500" />
              : improvement?.trending === "needs_attention" || improvementData?.status === "worsening"
              ? <ArrowUpRight className="w-4.5 h-4.5 text-red-500" />
              : <Minus className="w-4.5 h-4.5 text-gray-400" />,
            value: improvement?.trending === "improving" ? "Getting Better" :
                   improvement?.trending === "needs_attention" ? "Needs Work" :
                   improvementData?.status === "improving" ? "Getting Better" :
                   improvementData?.status === "worsening" ? "Needs Work" : "Steady",
            label: "Overall Trend"
          },
        ].map((stat, i) => (
          <div key={i} className="bg-card rounded-2xl border p-4 shadow-sm text-center space-y-1.5">
            <div className="mx-auto">{stat.icon}</div>
            <p className="text-lg font-bold text-foreground">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ===== COMPARISON + GAUGES ===== */}
      {latest && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Comparison Card */}
          <div className="bg-card rounded-2xl border p-5 shadow-sm">
            <h3 className="font-semibold text-foreground text-sm mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Latest vs Previous
            </h3>
            <div className="space-y-4">
              {[
                { label: "Reading Risk", key: "dyslexia_score", color: "#ef4444", icon: <Eye className="w-3.5 h-3.5" />, inverse: true },
                { label: "Writing Risk", key: "dysgraphia_score", color: "#f59e0b", icon: <PenTool className="w-3.5 h-3.5" />, inverse: true },
                { label: "Normal Score", key: "normal_score", color: "#22c55e", icon: <CheckCircle className="w-3.5 h-3.5" />, inverse: false },
              ].map(({ label, key, color, icon, inverse }) => {
                const curr = latest[key] || 0;
                const prev = previous?.[key] || 0;
                const diff = previous ? curr - prev : 0;
                const diffPositive = inverse ? diff < 0 : diff > 0;
                const diffNegative = inverse ? diff > 0 : diff < 0;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs flex items-center gap-1.5" style={{ color }}>{icon} {label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold" style={{ color }}>{curr.toFixed(1)}%</span>
                        {previous && diff !== 0 && (
                          <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                            diffPositive ? "bg-green-100 text-green-700" : diffNegative ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"
                          )}>
                            {diff > 0 ? "+" : ""}{diff.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(curr, 100)}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
              {previous && (
                <p className="text-[10px] text-muted-foreground pt-2 border-t">
                  Compared to Test #{previous.session_number} ({previous.date ? new Date(previous.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""})
                </p>
              )}
              {!previous && (
                <p className="text-[10px] text-muted-foreground pt-2 border-t">
                  Take another test to see how your scores change
                </p>
              )}
            </div>
          </div>

          {/* Gauges */}
          <div className="bg-card rounded-2xl border p-5 shadow-sm flex flex-col items-center justify-center">
            <h3 className="font-semibold text-foreground text-xs mb-3 flex items-center gap-1.5 self-start">
              <Eye className="w-4 h-4 text-red-500" /> Reading Risk Level
            </h3>
            <canvas ref={gaugeReading} style={{ width: "160px", height: "96px" }} />
            <p className={cn("text-xs font-medium px-3 py-1 rounded-full mt-3 border",
              (latest.dyslexia_score || 0) >= 60 ? "text-red-600 bg-red-50 border-red-200"
              : (latest.dyslexia_score || 0) >= 30 ? "text-orange-600 bg-orange-50 border-orange-200"
              : "text-green-600 bg-green-50 border-green-200"
            )}>
              {riskLabel(latest.dyslexia_score || 0)} Risk
            </p>
          </div>
          <div className="bg-card rounded-2xl border p-5 shadow-sm flex flex-col items-center justify-center">
            <h3 className="font-semibold text-foreground text-xs mb-3 flex items-center gap-1.5 self-start">
              <PenTool className="w-4 h-4 text-amber-500" /> Writing Risk Level
            </h3>
            <canvas ref={gaugeWriting} style={{ width: "160px", height: "96px" }} />
            <p className={cn("text-xs font-medium px-3 py-1 rounded-full mt-3 border",
              (latest.dysgraphia_score || 0) >= 60 ? "text-red-600 bg-red-50 border-red-200"
              : (latest.dysgraphia_score || 0) >= 30 ? "text-orange-600 bg-orange-50 border-orange-200"
              : "text-green-600 bg-green-50 border-green-200"
            )}>
              {riskLabel(latest.dysgraphia_score || 0)} Risk
            </p>
          </div>
        </div>
      )}

      {/* ===== TREND CHART + PIE ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-card rounded-2xl border p-5 shadow-sm">
          <h3 className="font-semibold text-foreground text-sm mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> How Your Risk Changes Over Time
          </h3>
          <p className="text-[11px] text-muted-foreground mb-3">Lower reading/writing risk = better progress</p>
          <canvas ref={trendChartRef} style={{ width: "100%", height: "220px" }} />
          {history.length < 2 && (
            <p className="text-xs text-muted-foreground text-center py-6">
              Take at least 2 assessments to see your trend line here
            </p>
          )}
        </div>
        <div className="bg-card rounded-2xl border p-5 shadow-sm">
          <h3 className="font-semibold text-foreground text-sm mb-1 flex items-center gap-2">
            <Target className="w-4 h-4 text-violet-500" /> Latest Score Split
          </h3>
          <p className="text-[11px] text-muted-foreground mb-3">Your most recent test breakdown</p>
          {latest ? (
            <>
              <div className="flex justify-center">
                <canvas ref={pieChartRef} style={{ width: "180px", height: "180px" }} />
              </div>
              <div className="flex justify-center gap-4 mt-3">
                {[
                  { label: "Reading", color: "#ef4444" },
                  { label: "Writing", color: "#f59e0b" },
                  { label: "Normal", color: "#22c55e" },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                    {l.label}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-10">No test data yet</p>
          )}
        </div>
      </div>

      {/* ===== IMPROVEMENT BANNER ===== */}
      {improvement && (
        <div className={cn(
          "rounded-2xl border p-4 flex items-center gap-4",
          improvement.trending === "improving" ? "bg-green-50/80 border-green-200"
          : improvement.trending === "needs_attention" ? "bg-orange-50/80 border-orange-200"
          : "bg-blue-50/80 border-blue-200"
        )}>
          {improvement.trending === "improving"
            ? <ArrowDownRight className="w-5 h-5 text-green-600 shrink-0" />
            : improvement.trending === "needs_attention"
            ? <ArrowUpRight className="w-5 h-5 text-orange-600 shrink-0" />
            : <Minus className="w-5 h-5 text-blue-600 shrink-0" />}
          <div className="flex-1">
            <p className="font-semibold text-sm text-foreground">
              {improvement.trending === "improving" ? "Your risk scores are going down — keep going!" :
               improvement.trending === "needs_attention" ? "Risk scores went up — more practice will help!" :
               "Scores are holding steady — consistency is key!"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Reading risk changed by{" "}
              <span className={cn("font-semibold", improvement.dyslexia_change < 0 ? "text-green-600" : improvement.dyslexia_change > 0 ? "text-red-600" : "")}>
                {improvement.dyslexia_change > 0 ? "+" : ""}{improvement.dyslexia_change}%
              </span>
              {" · Writing risk changed by "}
              <span className={cn("font-semibold", improvement.dysgraphia_change < 0 ? "text-green-600" : improvement.dysgraphia_change > 0 ? "text-red-600" : "")}>
                {improvement.dysgraphia_change > 0 ? "+" : ""}{improvement.dysgraphia_change}%
              </span>
              {" · "}{improvement.sessions_completed} tests so far
            </p>
          </div>
        </div>
      )}

      {/* ===== LEVEL DISTRIBUTION ===== */}
      {analyticsData?.level_distribution && Object.keys(analyticsData.level_distribution).length > 0 && (
        <div className="bg-card rounded-2xl border p-5 shadow-sm">
          <h3 className="font-semibold text-foreground text-sm mb-1 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-500" /> Your Test Results Distribution
          </h3>
          <p className="text-[11px] text-muted-foreground mb-3">How many times each result appeared across all your tests</p>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(analyticsData.level_distribution).map(([level, count]) => (
              <div key={level} className={cn("px-4 py-2 rounded-xl border text-sm font-medium", levelColor(level))}>
                {levelLabel(level)}: <span className="font-bold">{count as number} time{(count as number) !== 1 ? "s" : ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== ASSESSMENT HISTORY ===== */}
      <div className="bg-card rounded-2xl border p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <Brain className="w-4 h-4 text-violet-500" /> Your Assessment History
          </h3>
          <span className="text-[10px] text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">Click any test to view full report</span>
        </div>
        {history.length > 0 ? (
          <>
            <div className="space-y-2">
              {visibleHistory.slice().reverse().map((h: any, i: number) => (
                <button key={i}
                  onClick={() => openReport(h)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all",
                    selectedReport?.session_number === h.session_number
                      ? "bg-primary/10 ring-2 ring-primary/20"
                      : "bg-secondary/20 hover:bg-secondary/40 hover:shadow-sm"
                  )}
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {h.session_number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {h.stage || "Normal"} · <span className="text-muted-foreground">{levelLabel(h.prediction || h.level)}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {h.date ? new Date(h.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-foreground">{h.confidence}% sure</div>
                    <div className="flex gap-2 text-[10px] mt-0.5">
                      <span className="text-red-500 font-medium">{riskLabel(h.dyslexia_score)}</span>
                      <span className="text-amber-500 font-medium">{riskLabel(h.dysgraphia_score)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {history.length > 4 && (
              <button onClick={() => setExpandedHistory(!expandedHistory)} className="w-full mt-3 py-2 text-xs text-primary font-medium flex items-center justify-center gap-1 hover:bg-primary/5 rounded-lg transition-colors">
                {expandedHistory ? <><ChevronUp className="w-3.5 h-3.5" /> Show fewer</> : <><ChevronDown className="w-3.5 h-3.5" /> Show all {history.length} tests</>}
              </button>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">
            No tests taken yet. Complete your first assessment to start tracking your progress!
          </p>
        )}
      </div>

      {/* ===== REPORT MODAL ===== */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedReport(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm p-5 pb-3 border-b flex items-center justify-between z-10 rounded-t-2xl">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Test #{selectedReport.session_number} Report
              </h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => window.print()} className="rounded-lg text-xs h-8">
                  <Download className="w-3.5 h-3.5 mr-1" /> Download PDF
                </Button>
                <button onClick={() => setSelectedReport(null)} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {reportLoading ? (
              <div className="p-10 text-center text-muted-foreground">
                <Clock className="w-5 h-5 animate-spin mx-auto mb-2" /> Loading report...
              </div>
            ) : (
              <div className="p-5 space-y-5">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-muted-foreground mb-1">Result</p>
                    <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full border", levelColor(selectedReport.prediction || selectedReport.diagnosis?.prediction || ""))}>
                      {levelLabel(selectedReport.prediction || selectedReport.diagnosis?.prediction || "—")}
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-muted-foreground mb-1">Severity</p>
                    <p className="text-base font-bold text-foreground">{selectedReport.stage || selectedReport.diagnosis?.stage || "Normal"}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-muted-foreground mb-1">AI Confidence</p>
                    <p className="text-base font-bold text-foreground">{selectedReport.confidence || selectedReport.diagnosis?.confidence || 0}%</p>
                  </div>
                </div>

                {/* Risk Bars */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-xs text-foreground">Risk Scores</h4>
                  {[
                    { label: "Reading Risk (Dyslexia)", val: selectedReport.dyslexia_score || selectedReport.risk_scores?.dyslexia_risk || 0, color: "#ef4444" },
                    { label: "Writing Risk (Dysgraphia)", val: selectedReport.dysgraphia_score || selectedReport.risk_scores?.dysgraphia_risk || 0, color: "#f59e0b" },
                    { label: "Normal Score", val: selectedReport.normal_score || (selectedReport.probabilities?.normal ? Math.round(selectedReport.probabilities.normal * 100) : 0), color: "#22c55e" },
                  ].map(bar => (
                    <div key={bar.label}>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-muted-foreground">{bar.label}</span>
                        <span className="font-bold" style={{ color: bar.color }}>{bar.val}% — {riskLabel(bar.val)}</span>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(bar.val, 100)}%`, backgroundColor: bar.color }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* What We Found (SHAP) */}
                {selectedReport.feature_analysis?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-xs text-foreground flex items-center gap-1">
                      <Brain className="w-3.5 h-3.5" /> What We Found
                    </h4>
                    <p className="text-[10px] text-muted-foreground">These factors had the biggest impact on your score</p>
                    <div className="space-y-1.5">
                      {selectedReport.feature_analysis.slice(0, 5).map((f: any, i: number) => {
                        const impactPct = Math.min(Math.round(f.impact * 1000), 100);
                        return (
                          <div key={i} className="flex items-center gap-2 text-[11px] py-1.5 px-2 bg-secondary/20 rounded-lg">
                            <div className={cn("w-2 h-2 rounded-full shrink-0", f.direction === "positive" ? "bg-red-400" : "bg-green-400")} />
                            <span className="text-foreground flex-1">{f.description || f.feature}</span>
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden shrink-0">
                              <div className={cn("h-full rounded-full", f.direction === "positive" ? "bg-red-400" : "bg-green-400")}
                                style={{ width: `${impactPct}%` }} />
                            </div>
                            <span className={cn("font-semibold text-[10px] w-8 text-right shrink-0", f.direction === "positive" ? "text-red-500" : "text-green-500")}>
                              {f.direction === "positive" ? "High" : "OK"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Error Patterns */}
                {selectedReport.error_patterns && (selectedReport.error_patterns.reversals?.length > 0 || selectedReport.error_patterns.problem_words?.length > 0) && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-xs text-foreground flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Patterns We Noticed
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {(selectedReport.error_patterns.reversals || []).map((r: string, i: number) => (
                        <span key={`r${i}`} className="px-2 py-1 bg-red-50 text-red-700 rounded-lg text-[10px] font-medium border border-red-200">
                          Confuses {r}
                        </span>
                      ))}
                      {(selectedReport.error_patterns.problem_words || []).map((w: string, i: number) => (
                        <span key={`w${i}`} className="px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-medium border border-amber-200">
                          Struggles with "{w}"
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* What To Practice */}
                {selectedReport.recommendations?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-xs text-foreground flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500" /> What To Practice Next
                    </h4>
                    <ul className="space-y-1.5">
                      {selectedReport.recommendations.map((r: string, i: number) => (
                        <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-2 py-1 px-2 bg-green-50/50 rounded-lg">
                          <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 shrink-0" /> {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
