"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Shield, Activity, GraduationCap, Clock, BookOpen, PenTool, LayoutDashboard } from "lucide-react";
import { api } from "@/lib/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Link from "next/link";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function FullReportContent() {
  const searchParams = useSearchParams();
  const studentId = searchParams.get("student_id");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReport() {
      try {
        const query = studentId ? `?student_id=${studentId}` : "";
        const res = await api.get(`/reports/full${query}`);
        setData(res);
      } catch (err: any) {
        setError(err.message || "Failed to load the full report.");
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [studentId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="text-center py-20 text-muted-foreground">Loading Longitudinal Report...</div>;
  }

  if (error || !data) {
    return <div className="text-center py-20 text-destructive">{error || "No data found"}</div>;
  }

  // Extract graph data (assessments only)
  const graphData = data.timeline
    .filter((event: any) => event.type === "assessment")
    .map((assessment: any, index: number) => ({
      label: `Assmt ${index + 1}`,
      reading: assessment.scores?.reading || 0,
      writing: assessment.scores?.writing || 0,
      date: new Date(assessment.date).toLocaleDateString()
    }));

  return (
    <div className="max-w-4xl mx-auto pb-20 mt-4">
      {/* Action Bar (Hidden when printing) */}
      <div className="flex items-center justify-between mb-8 print:hidden">
        <Link href="/progress">
          <Button variant="ghost" size="sm" className="rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
        </Link>
        <Button onClick={handlePrint} size="sm" className="rounded-xl px-6 bg-primary hover:bg-primary/90">
          <Download className="w-4 h-4 mr-2" /> Export to PDF
        </Button>
      </div>

      <div className="bg-white border rounded-3xl p-8 sm:p-12 shadow-sm min-h-screen relative print-container" id="printable-report">
        
        {/* Medical Report Header */}
        <div className="flex items-start justify-between border-b pb-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <span className="font-bold text-xl text-primary">M</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground" style={{ fontFamily: "var(--font-fredoka)" }}>
                MENTIS Longitudinal Report
              </h1>
            </div>
            <p className="text-sm text-muted-foreground max-w-sm">
              Comprehensive timeline of cognitive screenings and therapeutic training sessions.
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="font-medium text-foreground">Patient Information</p>
            <p className="text-muted-foreground mt-1">Name: <span className="text-foreground">{data.user_info?.name}</span></p>
            <p className="text-muted-foreground">Email: <span className="text-foreground">{data.user_info?.email}</span></p>
            <p className="text-muted-foreground">Generated: <span className="text-foreground">{new Date().toLocaleDateString()}</span></p>
          </div>
        </div>

        {/* Global Progress Chart */}
        {graphData.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-primary" /> Cognitive Risk Trend
            </h2>
            <div className="h-64 w-full bg-secondary/10 rounded-2xl p-4 border border-border/50">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={graphData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.02 60)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "oklch(0.5 0.03 45)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "oklch(0.5 0.03 45)" }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ borderRadius: "12px", border: "1px solid oklch(0.92 0.02 60)" }}
                    labelStyle={{ fontWeight: "bold", color: "oklch(0.25 0.02 45)", marginBottom: "4px" }}
                  />
                  <Line type="monotone" strokeWidth={3} dataKey="reading" stroke="#ef4444" name="Reading Risk (%)" dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" strokeWidth={3} dataKey="writing" stroke="#f59e0b" name="Writing Risk (%)" dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Interleaved Timeline */}
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-6">
          <Clock className="w-5 h-5 text-primary" /> Session Therapy Timeline
        </h2>

        <div className="relative pl-6 space-y-8 before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
          {data.timeline.map((event: any, index: number) => {
            
            if (event.type === "assessment") {
              const date = new Date(event.date);
              return (
                <div key={index} className="relative z-10 flex flex-col md:flex-row gap-4 items-start break-inside-avoid">
                  {/* Timeline Node */}
                  <div className="absolute -left-6 md:left-1/2 md:-ml-8 w-16 flex justify-center print:hidden">
                    <div className="w-10 h-10 bg-white border-2 border-primary rounded-full flex items-center justify-center shadow-sm z-10">
                      <Shield className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  
                  {/* Assessment Card */}
                  <div className="md:w-1/2 md:pr-12 md:text-right w-full print:w-full print:pr-0 print:text-left">
                    <div className="bg-primary/5 border border-primary/20 p-5 rounded-2xl inline-block w-full text-left">
                      <p className="text-xs text-primary font-bold tracking-wider uppercase mb-1">
                        Diagnostic Assessment • {date.toLocaleDateString()}
                      </p>
                      <h3 className="text-xl font-bold text-foreground capitalize mb-3">
                        {event.level || "Normal"} Result ({event.confidence}% Conf.)
                      </h3>
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground flex items-center gap-1"><BookOpen className="w-4 h-4"/> Reading Risk</span>
                          <span className="font-bold text-red-600">{event.scores.reading}%</span>
                        </div>
                        <div className="w-full bg-border/50 rounded-full h-1.5 hidden print:block">
                          <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${event.scores.reading}%` }} />
                        </div>
                        
                        <div className="flex justify-between items-center text-sm mt-1">
                          <span className="text-muted-foreground flex items-center gap-1"><PenTool className="w-4 h-4"/> Writing Risk</span>
                          <span className="font-bold text-amber-600">{event.scores.writing}%</span>
                        </div>
                        <div className="w-full bg-border/50 rounded-full h-1.5 hidden print:block">
                          <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${event.scores.writing}%` }} />
                        </div>
                        
                        <p className="text-xs text-muted-foreground italic mt-2">
                          Session ID: {event.session_id}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="hidden md:block w-1/2" />
                </div>
              );
            }
            
            if (event.type === "training_period") {
              const startDate = new Date(event.start_date);
              const endDate = new Date(event.end_date);
              const diffDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)));
              
              return (
                <div key={index} className="relative z-10 flex flex-col md:flex-row gap-4 items-start break-inside-avoid">
                  {/* Timeline Node */}
                  <div className="absolute -left-6 md:left-1/2 md:-ml-8 w-16 flex justify-center print:hidden">
                    <div className="w-8 h-8 bg-card border-2 border-blue-400 rounded-full flex items-center justify-center shadow-sm z-10 mt-1">
                      <GraduationCap className="w-4 h-4 text-blue-500" />
                    </div>
                  </div>
                  
                  {/* Training Block (Right Side) */}
                  <div className="hidden md:block w-1/2" />
                  <div className="md:w-1/2 md:pl-12 w-full print:w-full print:pl-0">
                    <div className="bg-card border border-border/50 p-5 rounded-2xl inline-block w-full text-left shadow-sm">
                      <p className="text-xs text-blue-600 font-bold tracking-wider uppercase mb-1">
                        Therapy Period • {diffDays} {diffDays === 1 ? 'Day' : 'Days'}
                      </p>
                      <h3 className="text-lg font-bold text-foreground mb-3">
                        {event.exercises_completed} Training Exercises
                      </h3>
                      <div className="pt-3 border-t flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          Total XP Growth
                        </span>
                        <span className="font-bold text-blue-600">+{event.xp_earned} XP</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
          })}
        </div>

      </div>
    </div>
  );
}

export default function FullReportPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-muted-foreground">Loading...</div>}>
      <FullReportContent />
    </Suspense>
  );
}
