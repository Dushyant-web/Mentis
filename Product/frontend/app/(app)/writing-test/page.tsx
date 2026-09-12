"use client";

import { useState, useRef, useEffect } from "react";
import { usePenTracking } from "@/hooks/usePenTracking";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { api, API_BASE_URL } from "@/lib/api";
import { Eraser, Send, Undo2, ArrowRight, CheckCircle, PenTool, Volume2 } from "lucide-react";
import Link from "next/link";

export default function WritingTestPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeCount, setStrokeCount] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  // Undo snapshots live in a ref, not React state — storing large ImageData in
  // state forced a full re-render + big memory churn on every stroke (the canvas
  // is 2000px tall), which is what made drawing feel laggy.
  const historyRef = useRef<ImageData[]>([]);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const lastMidRef = useRef({ x: 0, y: 0 });
  const [userName, setUserName] = useState("User");

  // Assessment State
  const [currentStep, setCurrentStep] = useState(1);
  const [subStepIndex, setSubStepIndex] = useState(0);
  const [assessmentContent, setAssessmentContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userInput, setUserInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errors, setErrors] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [repIndex, setRepIndex] = useState(0); // 0-4 for mirror words

  const { strokesRef, startStroke, moveStroke, endStroke, reset } = usePenTracking();

  // Load content and user name — REUSE session from reading test
  useEffect(() => {
    async function init() {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          window.location.href = "/login";
          return;
        }

        // 🔥 FIX: Reuse session from reading test — do NOT create a new one
        const existingSessionId = localStorage.getItem("assessment_session_id") || localStorage.getItem("session_id");
        if (existingSessionId) {
          setSessionId(Number(existingSessionId));
          // Reusing existing session
        } else {
          // Fallback: create session if none exists (user navigated directly)
          console.warn("⚠️ No existing session. Creating new one...");
          const startData = await api.get("/assessment/start");
          if (startData && startData.session_id) {
            setSessionId(startData.session_id);
            localStorage.setItem("assessment_session_id", startData.session_id.toString());
          }
        }
        
        // 🔥 RESET PEN DATA FOR THIS TEST (keep eye_tests from reading test)
        localStorage.removeItem("pen_data");
        localStorage.removeItem("assessment_errors");

        // 2. Get Profile (with auth guard)
        const profileData = await api.get("/auth/profile");
        if (profileData && profileData.success) {
          setUserName(profileData.data.name || "User");
        }

        // 3. Get Content (no auth required)
        const contentData = await api.get("/assessment/tasks/content");
        setAssessmentContent(contentData);

      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Initialize canvas
  useEffect(() => {
    if (loading || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 5;
  }, [loading, currentStep, subStepIndex]);


  const getPos = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (e: React.PointerEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    // Keep receiving moves even if the pointer briefly leaves the canvas.
    try { canvas.setPointerCapture(e.pointerId); } catch {}

    // Undo snapshot — once per stroke, kept in a ref (capped) to avoid re-renders.
    try {
      const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
      historyRef.current = [...historyRef.current.slice(-7), snap];
      setCanUndo(true);
    } catch {}

    const pos = getPos(e.clientX, e.clientY);
    lastPosRef.current = pos;
    lastMidRef.current = pos;
    isDrawingRef.current = true;
    setIsDrawing(true);

    startStroke(pos.x, pos.y, e.pressure || 0.5, e.tiltX ?? 0, e.tiltY ?? 0);

    // Dot so a single tap leaves a mark.
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const draw = (e: React.PointerEvent) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    // Coalesced events expose every sample captured between animation frames →
    // smooth, gap-free lines on fast strokes (the Apple Notes feel).
    const native = e.nativeEvent as PointerEvent;
    const samples =
      typeof native.getCoalescedEvents === "function"
        ? native.getCoalescedEvents()
        : [native];

    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 4;

    for (const s of samples) {
      const pos = getPos(s.clientX, s.clientY);
      moveStroke(pos.x, pos.y, (s as PointerEvent).pressure || 0.5, (s as PointerEvent).tiltX ?? 0, (s as PointerEvent).tiltY ?? 0);

      // Quadratic smoothing: draw from the last midpoint to the new midpoint using
      // the previous raw point as the control point — turns jagged segments into a curve.
      const mid = {
        x: (lastPosRef.current.x + pos.x) / 2,
        y: (lastPosRef.current.y + pos.y) / 2,
      };
      ctx.beginPath();
      ctx.moveTo(lastMidRef.current.x, lastMidRef.current.y);
      ctx.quadraticCurveTo(lastPosRef.current.x, lastPosRef.current.y, mid.x, mid.y);
      ctx.stroke();

      lastPosRef.current = pos;
      lastMidRef.current = mid;
    }
  };

  const stopDrawing = (e: React.PointerEvent) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    setIsDrawing(false);
    setStrokeCount((s) => s + 1);

    const canvas = canvasRef.current;
    try { canvas?.releasePointerCapture(e.pointerId); } catch {}

    const ctx = canvas?.getContext("2d");
    if (ctx) {
      // Close the final segment to the actual lift-off point.
      const pos = getPos(e.clientX, e.clientY);
      ctx.beginPath();
      ctx.moveTo(lastMidRef.current.x, lastMidRef.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      endStroke(pos.x, pos.y, e.pressure || 0.5, e.tiltX ?? 0, e.tiltY ?? 0);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    historyRef.current = [];
    setCanUndo(false);
    reset();
  };

  const undo = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas || historyRef.current.length === 0) return;
    const last = historyRef.current[historyRef.current.length - 1];
    ctx.putImageData(last, 0, 0);
    historyRef.current = historyRef.current.slice(0, -1);
    setCanUndo(historyRef.current.length > 0);
  };

  // Section Logic
  const getCurrentTarget = () => {
    if (!assessmentContent) return "";
    switch (currentStep) {
      case 1: return assessmentContent.mirror_words[subStepIndex];
      case 2: return assessmentContent.word_bank[subStepIndex];
      case 3: return `Hello ${userName}! My name is ${userName}. I like learning.`;
      case 4: return assessmentContent.word_bank[(subStepIndex + 5) % assessmentContent.word_bank.length]; // Audio items
      default: return "";
    }
  };

  const playAudio = () => {
    const target = getCurrentTarget();
    if (!target) return;
    const utterance = new SpeechSynthesisUtterance(target);
    window.speechSynthesis.speak(utterance);
  };

  const handleNext = async () => {
    // 🧠 Guard: Prevent multiple analysis calls
    if (isAnalyzing) return;

    const target = getCurrentTarget();
    
    // -------------------------
    // 🧠 CANVAS ANALYSIS (NEW)
    // -------------------------
    if (currentStep < 5) {
      setIsAnalyzing(true);
      try {
        const canvas = canvasRef.current;
        if (canvas) {
          // 🧠 ACCURACY: the canvas draws dark ink on a TRANSPARENT background.
          // Exporting that directly composites onto black → near-invisible ink for OCR.
          // Composite onto a white background first (big OCR accuracy win).
          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          const tempCtx = tempCanvas.getContext("2d");
          if (tempCtx) {
            tempCtx.fillStyle = "white";
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.drawImage(canvas, 0, 0);
          }
          const imageData = tempCanvas.toDataURL("image/jpeg", 0.85);
          const token = localStorage.getItem('token');
          
          const analysis = await api.post("/assessment/analyze-canvas", {
            image: imageData,
            target_word: target
          });

          console.log("=== HANDWRITING ANALYSIS ===");
          console.log("Target word:", target);
          console.log("OCR detected:", analysis.text || "NOTHING");
          console.log("Is correct:", analysis.is_correct);
          console.log("Confidence:", analysis.confidence);
          console.log("Similarity:", analysis.similarity);
          console.log("Full response:", analysis);
          console.log("============================");

          if (!analysis.is_correct) {
            setErrors(prev => [...prev, {
              step: currentStep,
              subStep: subStepIndex,
              rep: repIndex,
              target,
              actual: analysis.text || "UNCLEAR",
              confidence: analysis.confidence,
              timestamp: new Date().toISOString()
            }]);
          }
        }
      } catch (err) {
        console.error("Analysis error:", err);
      }
    } else {
      // Matching Step: Just check userInput (as before)
      if (userInput.trim().toLowerCase() !== target.trim().toLowerCase()) {
        setErrors(prev => [...prev, {
          step: currentStep,
          subStep: subStepIndex,
          target,
          actual: userInput,
          timestamp: new Date().toISOString()
        }]);
      }
    }

    // -------------------------
    // 🧠 PERSIST PEN DATA (ACCUMULATE)
    // -------------------------
    const syncPenData = () => {
      if (strokesRef.current.length > 0) {
        const existingPenData = JSON.parse(localStorage.getItem("pen_data") || "[]");
        const updatedPenData = [...existingPenData, ...strokesRef.current];
        localStorage.setItem("pen_data", JSON.stringify(updatedPenData));
        // Pen data synced
        reset(); // Clear local buffer after syncing to master
      }
    };

    syncPenData();

    try {
      // -------------------------
      // 🧠 PROGRESS LOGIC
      // -------------------------
      let nextSub = subStepIndex + 1;
      let nextStep = currentStep;

      const limits = [0, 10, 20, 1, 10, 10]; // mirror(10), bank(20), intro(1), audio(10), matching(10)
      
      if (nextSub >= limits[currentStep]) {
        nextSub = 0;
        nextStep = currentStep + 1;
      }

      if (nextStep > 5) {
        // ✅ FINAL SYNC BEFORE FINISHING
        syncPenData();
        localStorage.setItem("assessment_errors", JSON.stringify(errors));
        if (sessionId) {
          localStorage.setItem("assessment_session_id", sessionId.toString());
        }
        setFinished(true);
      } else {
        setCurrentStep(nextStep);
        setSubStepIndex(nextSub);
        setUserInput("");
        // Visual clear only, reset() is already called in syncPenData
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
          historyRef.current = [];
          setCanUndo(false);
        }
      }
    } finally {
      // 🧠 Finalize: Always unlock the button after all state transitions
      setIsAnalyzing(false);
    }
  };

  // Submission handled by AnalysisPage

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[400px] gap-4">
      <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="text-muted-foreground font-medium animate-pulse">Preparing Assessment Content...</p>
    </div>
  );

  const target = getCurrentTarget();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="opacity-0 animate-fade-in-up">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3"
          style={{ fontFamily: "var(--font-fredoka)" }}>
          <PenTool className="w-7 h-7 text-primary flex-shrink-0" />
          Step {currentStep} of 5: {
            currentStep === 1 ? "Mirror Words Task" :
            currentStep === 2 ? "Word Bank Challenge" :
            currentStep === 3 ? "Introductory Handwriting" :
            currentStep === 4 ? "Listen & Write" : "Matching Quest"
          }
        </h1>
        <p className="text-muted-foreground mt-1 text-lg">
          {currentStep === 1 ? `Write the word below **5 times** on the canvas before clicking Next (Trial ${subStepIndex + 1} of 10)` :
           currentStep === 2 ? `Write the word precisely (${subStepIndex + 1} of 20)` :
           currentStep === 3 ? "Write exactly as you normally would" :
           currentStep === 4 ? "Listen carefully and write the word" : "Choose the correct option"}
        </p>
      </div>

      {!finished ? (
        <>
          {/* Instruction Card */}
          <div className="bg-gradient-to-r from-primary/5 to-accent/10 rounded-2xl border border-border/50 p-5 animate-fade-in-up">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                <PenTool className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-foreground text-lg">
                  {currentStep === 4 ? "Dictation Mode" : "Target Content"}
                </h3>
                {currentStep === 4 ? (
                  <Button onClick={playAudio} className="mt-2 bg-primary/20 text-primary hover:bg-primary/30 border-none shadow-none gap-2">
                    <Volume2 className="w-4 h-4" />
                    Play Audio
                  </Button>
                ) : currentStep === 5 ? (
                  <div className="mt-3">
                    <p className="font-medium text-lg mb-2">{assessmentContent?.matching_questions?.[subStepIndex]?.question || "Select the correct answer"}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(assessmentContent?.matching_questions?.[subStepIndex]?.options || []).map((opt: string, i: number) => (
                        <Button key={i} variant="outline" className={cn("justify-start h-12 px-4 rounded-xl transition-all", userInput === opt ? "border-primary bg-primary/10 shadow-sm" : "hover:bg-primary/5")}
                          onClick={() => setUserInput(opt)}>
                          {opt}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-3xl font-bold text-primary mt-1 tracking-widest bg-white/50 w-fit px-4 py-2 rounded-xl border border-primary/10">
                    {target}
                  </p>
                )}
                
                {currentStep === 5 && (
                  <div className="mt-4">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                      Selected Answer
                    </label>
                    <div className="w-full bg-white border-2 border-primary/20 rounded-xl h-12 flex items-center px-4 text-lg font-medium">
                      {userInput || "Pick an option..."}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Canvas Area (Hidden for matching) */}
          {currentStep < 5 && (
            <div className={cn(
              "bg-card rounded-2xl border-2 shadow-sm overflow-hidden animate-fade-in-up transition-colors",
              isDrawing ? "border-primary/40" : "border-border/50"
            )}>
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-secondary/30">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium">Writing Canvas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button variant="ghost" size="sm" onClick={undo} disabled={!canUndo}
                    className="rounded-lg text-xs hover:bg-secondary">
                    <Undo2 className="w-3.5 h-3.5 mr-1" /> Undo
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearCanvas}
                    className="rounded-lg text-xs hover:bg-secondary text-red-500 hover:text-red-600">
                    <Eraser className="w-3.5 h-3.5 mr-1" /> Clear
                  </Button>
                </div>
              </div>
              <div className={cn(
                "relative bg-white overflow-y-auto min-h-[400px]",
                "bg-[linear-gradient(to_bottom,transparent_39px,#e5e5e5_40px),linear-gradient(to_right,transparent_34px,#fecaca_35px,#fecaca_37px,transparent_37px)]",
                "bg-[size:100%_40px,100%_100%]"
              )} style={{ maxHeight: "400px" }}>
                {/* CSS numbers for the grid */}
                <div className="absolute left-0 top-0 w-[35px] h-full pointer-events-none select-none border-r border-red-200">
                  {Array.from({length: 50}).map((_, i) => (
                    <div key={i} className="h-[40px] flex items-center justify-center text-[10px] text-slate-400 font-mono">
                      {i + 1}
                    </div>
                  ))}
                </div>
                <canvas
                  ref={canvasRef}
                  className="w-full canvas-drawing cursor-crosshair relative z-10"
                  style={{ height: "2000px", touchAction: "none" }}
                  onPointerDown={startDrawing}
                  onPointerMove={draw}
                  onPointerUp={stopDrawing}
                  onPointerCancel={stopDrawing}
                />
              </div>
            </div>
          )}

          {/* Submit/Next button */}
          <div className="flex justify-center animate-fade-in-up pt-4">
            <Button 
              onClick={handleNext} 
              disabled={isAnalyzing || (!userInput && currentStep === 5)}
              className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground px-10 h-14 text-lg font-bold shadow-lg shadow-primary/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-70"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3" />
                  Analyzing Handwriting...
                </>
              ) : (
                <>
                  {currentStep === 5 && subStepIndex === 9 ? "Complete Assessment" : "Next Exercise"}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </div>
        </>
      ) : (
        <div className="text-center py-20 px-6 bg-card rounded-3xl border border-border shadow-soft animate-bounce-in">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-4">Assessment Complete!</h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-8 text-lg">
            We've successfully recorded your writing and analyzed {errors.length} specific challenges.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/analysis">
              <Button className="rounded-2xl px-12 h-14 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/30 font-bold transition-all hover:scale-105 active:scale-95">
                View Deep Analysis <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Button variant="outline" className="rounded-2xl px-10 h-14 font-semibold" onClick={() => window.location.reload()}>
              Retake Test
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
