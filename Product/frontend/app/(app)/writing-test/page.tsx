"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Eraser, Send, Undo2, ArrowRight, CheckCircle, PenTool } from "lucide-react";
import Link from "next/link";

export default function WritingTestPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeCount, setStrokeCount] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const lastPosRef = useRef({ x: 0, y: 0 });

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
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
    ctx.lineWidth = 3;

    // Draw guide lines
    drawGuideLines(ctx, rect.width, rect.height);
  }, []);

  const drawGuideLines = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.save();
    ctx.strokeStyle = "#e5e5e5";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    const lineHeight = h / 5;
    for (let i = 1; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(0, lineHeight * i);
      ctx.lineTo(w, lineHeight * i);
      ctx.stroke();
    }

    // Center dashed line
    ctx.strokeStyle = "#d4d4d4";
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    ctx.restore();
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    // Save state for undo
    const dpr = window.devicePixelRatio || 1;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev.slice(-20), imageData]);

    const pos = getPos(e);
    lastPosRef.current = pos;
    setIsDrawing(true);

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const pos = getPos(e);
    const dx = pos.x - lastPosRef.current.x;
    const dy = pos.y - lastPosRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Pressure simulation based on speed
    const speed = Math.min(dist, 30);
    const width = Math.max(1.5, 4 - speed * 0.08);

    ctx.lineWidth = width;
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);

    lastPosRef.current = pos;
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      setStrokeCount((s) => s + 1);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGuideLines(ctx, rect.width, rect.height);
    setStrokeCount(0);
    setHistory([]);
  };

  const undo = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas || history.length === 0) return;

    const lastState = history[history.length - 1];
    ctx.putImageData(lastState, 0, 0);
    setHistory((prev) => prev.slice(0, -1));
    setStrokeCount((s) => Math.max(0, s - 1));
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="opacity-0 animate-fade-in-up">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3"
          style={{ fontFamily: "var(--font-fredoka)" }}>
          ✏️ Writing Test
        </h1>
        <p className="text-muted-foreground mt-1">
          Practice your handwriting on the canvas below
        </p>
      </div>

      {/* Instruction Card */}
      <div className="bg-gradient-to-r from-primary/5 to-accent/10 rounded-2xl border border-border/50 p-5 opacity-0 animate-fade-in-up"
        style={{ animationDelay: "200ms" }}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center flex-shrink-0">
            <PenTool className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-lg">Instructions</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Write <span className="font-bold text-primary text-base">&quot;qp&quot;</span> 20 times on the canvas below.
              Try to write naturally and at your normal speed. We&apos;ll analyze your
              writing rhythm and patterns. 🖊️
            </p>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {strokeCount}
                </span>
                <span className="text-muted-foreground">strokes recorded</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className={cn(
        "bg-card rounded-2xl border-2 shadow-sm overflow-hidden opacity-0 animate-fade-in-up transition-colors",
        isDrawing ? "border-primary/40" : "border-border/50"
      )} style={{ animationDelay: "400ms" }}>
        {/* Canvas toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-secondary/30">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full transition-colors",
              isDrawing ? "bg-green-500" : "bg-muted-foreground/30"
            )} />
            <span className="text-xs text-muted-foreground font-medium">
              {isDrawing ? "Drawing..." : "Ready to write"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={undo} disabled={history.length === 0}
              className="rounded-lg text-xs hover:bg-secondary">
              <Undo2 className="w-3.5 h-3.5 mr-1" /> Undo
            </Button>
            <Button variant="ghost" size="sm" onClick={clearCanvas}
              className="rounded-lg text-xs hover:bg-secondary text-red-500 hover:text-red-600">
              <Eraser className="w-3.5 h-3.5 mr-1" /> Clear
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div className="relative bg-white">
          <canvas
            ref={canvasRef}
            className="w-full canvas-drawing"
            style={{ height: "350px" }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />

          {/* Watermark */}
          {strokeCount === 0 && !isDrawing && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-4xl font-bold text-muted-foreground/10" style={{ fontFamily: "var(--font-fredoka)" }}>
                  qp qp qp
                </p>
                <p className="text-sm text-muted-foreground/30 mt-2">
                  Start writing here ↑
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Submit button */}
      {!submitted && strokeCount > 0 && (
        <div className="flex justify-center opacity-0 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          <Button onClick={handleSubmit}
            className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-12 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all">
            <Send className="w-4 h-4 mr-2" />
            Submit Writing Sample
          </Button>
        </div>
      )}

      {/* Results */}
      {submitted && (
        <div className="bg-gradient-to-r from-green-50 to-accent/10 rounded-2xl border border-green-200/50 p-6 opacity-0 animate-bounce-in">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-foreground text-lg">Writing Sample Captured! ✅</h3>
              <p className="text-muted-foreground text-sm mt-1">
                We recorded {strokeCount} strokes. Your handwriting data is ready for AI analysis!
              </p>
              <div className="flex gap-3 mt-4">
                <Link href="/analysis">
                  <Button className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25">
                    Analyze Now <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Button variant="outline" className="rounded-xl" onClick={() => {
                  setSubmitted(false);
                  clearCanvas();
                }}>
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
