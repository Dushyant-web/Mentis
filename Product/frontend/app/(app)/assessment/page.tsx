"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BookOpen, PenTool, ArrowRight, CheckCircle, ShieldCheck, Sparkles, Brain, RefreshCw, Lock } from "lucide-react";
import { api } from "@/lib/api";

export default function AssessmentLandingPage() {
  const [completedSteps, setCompletedSteps] = useState({
    reading: false,
    writing: false,
  });
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [sessionCompleted, setSessionCompleted] = useState({
    reading: false
  });

  useEffect(() => {
    // Check if reading was done in this browser session
    const readingDoneInSession = sessionStorage.getItem("reading_done_in_session") === "true";
    setSessionCompleted({ reading: readingDoneInSession });
    const fetchData = async () => {
      try {
        const eyeData = localStorage.getItem("eye_tests");
        const penData = localStorage.getItem("pen_data");
        
        setCompletedSteps({
          reading: !!eyeData,
          writing: !!penData,
        });

        // Fetch history
        const historyData = await api.get("/assessment/history");
        setHistory(historyData);
      } catch (err) {
        console.error("Failed to fetch assessment info:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleStartNew = () => {
    localStorage.removeItem("eye_tests");
    localStorage.removeItem("pen_data");
    localStorage.removeItem("has_completed_assessment");
    window.location.reload();
  };

  const router = useRouter();
  const [demoLoading, setDemoLoading] = useState(false);

  const handleDemoMode = async () => {
    setDemoLoading(true);
    try {
      const demoData = await api.get("/assessment/demo-results");
      localStorage.setItem("analysis_result", JSON.stringify(demoData));
      localStorage.setItem("has_completed_assessment", "true");
      router.push("/diagnosis");
    } catch (err) {
      console.error("Demo mode failed:", err);
    } finally {
      setDemoLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

  const latestResult = history.length > 0 ? history[0] : null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4 lg:py-8">
      {/* Header */}
      <div className="text-center space-y-3 opacity-0 animate-fade-in-up">
        <h1 className="text-4xl font-bold text-foreground flex items-center justify-center gap-3" style={{ fontFamily: "var(--font-fredoka)" }}>
          AI Diagnostic Assessment
          <Brain className="w-8 h-8 text-primary" />
        </h1>
        <div className="flex flex-col items-center gap-4 max-w-2xl mx-auto">
          <p className="text-muted-foreground text-lg">
            Complete both steps for a full cognitive analysis. Both tests must be completed in your current session to generate a new report.
          </p>
          {(completedSteps.reading || completedSteps.writing) && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleStartNew}
              className="rounded-full text-xs font-semibold hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Start Fresh Assessment (Clear Data)
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDemoMode}
            disabled={demoLoading}
            className="rounded-full text-xs font-semibold border-purple-300 text-purple-700 hover:bg-purple-50 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            {demoLoading ? "Loading Demo..." : "Try Demo Mode (Pre-computed Results)"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger-children">
        {/* Step 1: Reading */}
        <div className={`relative bg-card rounded-3xl border-2 p-8 transition-all duration-300 ${
          completedSteps.reading ? "border-green-200 bg-green-50/30" : "border-border/50 hover:border-primary/30"
        }`}>
          {completedSteps.reading && (
            <div className="absolute top-4 right-4 text-green-600">
              <CheckCircle className="w-6 h-6" />
            </div>
          )}
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-3">Step 1: Reading Test</h3>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            We track your eye movement while you read a simple text. This helps us understand your visual processing rhythm.
          </p>
          <Link href="/reading-test">
            <Button size="lg" className="w-full rounded-2xl font-bold group" variant={completedSteps.reading ? "outline" : "default"}>
              {completedSteps.reading ? "Retake Test" : "Start Reading Test"}
              <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>

        {/* Step 2: Writing */}
        <div className={`relative bg-card rounded-3xl border-2 p-8 transition-all duration-300 ${
          completedSteps.writing ? "border-green-200 bg-green-50/30" : "border-border/50 hover:border-accent/30"
        } ${!completedSteps.reading ? "opacity-60 pointer-events-none grayscale-[0.5]" : ""}`}>
          {completedSteps.writing ? (
            <div className="absolute top-4 right-4 text-green-600">
              <CheckCircle className="w-6 h-6" />
            </div>
          ) : !completedSteps.reading && (
            <div className="absolute top-4 right-4 text-muted-foreground/40">
              <ShieldCheck className="w-6 h-6" />
            </div>
          )}
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
            <PenTool className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-3 font-semibold">Step 2: Writing Test</h3>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Practice handwriting on our digital canvas to analyze your motor control, pressure, and letter formation timing.
          </p>
          {sessionCompleted.reading ? (
            <Link href="/writing-test">
              <Button size="lg" className="w-full rounded-2xl font-bold group" variant={completedSteps.writing ? "outline" : "default"}>
                {completedSteps.writing ? "Retake Test" : "Start Writing Test"}
                <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          ) : (
            <div className="w-full py-3 bg-secondary/50 rounded-2xl text-center text-muted-foreground/50 font-bold border border-dashed border-border flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Locked
            </div>
          )}
          {!sessionCompleted.reading && (
            <p className="text-xs text-center text-muted-foreground mt-4 font-medium flex items-center justify-center gap-1.5 opacity-70">
              <Lock className="w-3 h-3" /> <span>Complete Step 1 to Unlock</span>
            </p>
          )}
        </div>
      </div>

      {/* Previous Assessment Report (Summary) */}
      {latestResult && (
        <div className="bg-card rounded-3xl border border-border/50 p-6 opacity-0 animate-fade-in-up" style={{ animationDelay: "400ms" }}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xl font-bold text-foreground flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Your Last Assessment Report
            </h4>
            <span className="text-sm text-muted-foreground">
              {new Date(latestResult.created_at).toLocaleDateString()}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 bg-secondary/50 rounded-2xl text-center">
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Level</p>
              <p className="font-bold text-foreground capitalize">{latestResult.prediction}</p>
            </div>
            <div className="p-3 bg-secondary/50 rounded-2xl text-center">
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Reading</p>
              <p className="font-bold text-foreground capitalize">{latestResult.dyslexia_stage?.replace('_', ' ')}</p>
            </div>
            <div className="p-3 bg-secondary/50 rounded-2xl text-center">
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Writing</p>
              <p className="font-bold text-foreground capitalize">{latestResult.dysgraphia_stage?.replace('_', ' ')}</p>
            </div>
            <div className="p-3 bg-secondary/50 rounded-2xl text-center">
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Accuracy</p>
              <p className="font-bold text-foreground">{(latestResult.confidence * 100).toFixed(0)}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Safety/Privacy Info */}
      <div className="bg-secondary/30 rounded-2xl p-6 flex items-start gap-4 border border-border/50 opacity-0 animate-fade-in-up"
        style={{ animationDelay: "600ms" }}>
        <ShieldCheck className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
        <div>
          <h4 className="font-bold text-foreground">Privacy & Accuracy</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your biometric data (eye movement and pen strokes) is processed locally and anonymously. Total assessment takes about 5-8 minutes. For best results, ensure you are in a well-lit room and sitting comfortably.
          </p>
        </div>
      </div>

      {/* Redundant CTA removed as per user request */}

      {/* History List (Optional/Footer) */}
      {history.length > 1 && (
        <div className="pt-12">
          <h4 className="text-lg font-bold mb-4 opacity-0 animate-fade-in" style={{ animationDelay: "800ms" }}>All Previous Assessments</h4>
          <div className="space-y-3">
            {history.slice(1).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-card border border-border/30 rounded-2xl opacity-0 animate-fade-in" style={{ animationDelay: `${900 + (idx * 100)}ms` }}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-sm">
                    {history.length - 1 - idx}
                  </div>
                  <div>
                    <p className="font-semibold capitalize">{item.prediction}</p>
                    <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">Confidence: {(item.confidence * 100).toFixed(0)}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
