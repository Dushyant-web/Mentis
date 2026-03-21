"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Play, Square, RotateCcw, Camera, CheckCircle, ArrowRight, Eye } from "lucide-react";
import Link from "next/link";

const readingText = `The little fox ran quickly through the forest, jumping over fallen logs and dodging low branches. She was looking for her favorite berry bush near the old oak tree. The morning sun filtered through the leaves, creating patterns of light and shadow on the forest floor. Birds sang cheerfully in the treetops, and a gentle breeze rustled the tall grass. She paused at the stream to take a drink of cool water before continuing her journey. The berries would be perfectly ripe today, she could feel it in her whiskers.`;

const words = readingText.split(" ");

export default function ReadingTestPage() {
  const [status, setStatus] = useState<"ready" | "running" | "finished">("ready");
  const [time, setTime] = useState(0);
  const [webcamOn, setWebcamOn] = useState(false);
  const [currentWord, setCurrentWord] = useState(-1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startTest = useCallback(() => {
    setStatus("running");
    setWebcamOn(true);
    setCurrentWord(0);
    setTime(0);
    timerRef.current = setInterval(() => {
      setTime((t) => t + 1);
    }, 1000);
  }, []);

  const stopTest = useCallback(() => {
    setStatus("finished");
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrentWord(words.length);
  }, []);

  const resetTest = useCallback(() => {
    setStatus("ready");
    setTime(0);
    setCurrentWord(-1);
    setWebcamOn(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  // Simulate word-by-word reading progression
  useEffect(() => {
    if (status !== "running") return;
    const interval = setInterval(() => {
      setCurrentWord((prev) => {
        if (prev >= words.length - 1) {
          stopTest();
          return prev;
        }
        return prev + 1;
      });
    }, 350);
    return () => clearInterval(interval);
  }, [status, stopTest]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="opacity-0 animate-fade-in-up">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3"
          style={{ fontFamily: "var(--font-fredoka)" }}>
          📖 Reading Test
        </h1>
        <p className="text-muted-foreground mt-1">
          Read the paragraph below while we track your eye movements
        </p>
      </div>

      {/* Controls Bar */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4 opacity-0 animate-fade-in-up"
        style={{ animationDelay: "200ms" }}>
        {/* Timer */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="text-lg">⏱️</span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Time</p>
            <p className="text-2xl font-bold font-mono text-foreground tracking-wider">
              {formatTime(time)}
            </p>
          </div>
        </div>

        {/* Webcam Status */}
        <div className="flex items-center gap-3">
          <div className={cn(
            "relative w-10 h-10 rounded-xl flex items-center justify-center",
            webcamOn ? "bg-green-100" : "bg-secondary"
          )}>
            <Camera className={cn("w-5 h-5", webcamOn ? "text-green-600" : "text-muted-foreground")} />
            {webcamOn && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full webcam-dot border-2 border-card" />
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Eye Tracking</p>
            <p className={cn("text-sm font-semibold", webcamOn ? "text-green-600" : "text-muted-foreground")}>
              {webcamOn ? "Active" : "Inactive"}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {status === "ready" && (
            <Button onClick={startTest}
              className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all">
              <Play className="w-4 h-4 mr-2" />
              Start Reading
            </Button>
          )}
          {status === "running" && (
            <Button onClick={stopTest}
              className="rounded-xl bg-red-500 hover:bg-red-600 text-white">
              <Square className="w-4 h-4 mr-2" />
              Stop
            </Button>
          )}
          {status === "finished" && (
            <Button onClick={resetTest} variant="outline" className="rounded-xl">
              <RotateCcw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      </div>

      {/* Reading Area */}
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden opacity-0 animate-fade-in-up"
        style={{ animationDelay: "400ms" }}>
        {/* Reading progress bar */}
        <div className="h-1.5 bg-secondary">
          <div className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${currentWord >= 0 ? ((currentWord + 1) / words.length) * 100 : 0}%` }} />
        </div>

        <div className="p-8 lg:p-12">
          <div className="prose prose-lg max-w-none">
            <p className="text-xl lg:text-2xl leading-relaxed font-medium text-foreground/90 tracking-wide"
              style={{ lineHeight: "2.2" }}>
              {words.map((word, i) => (
                <span key={i}
                  className={cn(
                    "inline-block mr-2 px-1 py-0.5 rounded transition-all duration-200",
                    i === currentWord && "bg-primary/20 text-primary font-bold scale-105",
                    i < currentWord && "text-muted-foreground",
                    i > currentWord && status === "running" && "text-foreground/40"
                  )}
                >
                  {word}
                </span>
              ))}
            </p>
          </div>
        </div>

        {/* Eye tracking visual indicator */}
        {webcamOn && (
          <div className="px-8 pb-6">
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-xl px-4 py-2.5">
              <Eye className="w-4 h-4" />
              <span className="font-medium">Eye tracking is recording your reading pattern</span>
              <div className="ml-auto flex gap-1">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-1 bg-green-400 rounded-full animate-pulse-soft"
                    style={{
                      height: `${12 + Math.random() * 12}px`,
                      animationDelay: `${i * 200}ms`
                    }} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results / Next Step */}
      {status === "finished" && (
        <div className="bg-gradient-to-r from-green-50 to-accent/10 rounded-2xl border border-green-200/50 p-6 opacity-0 animate-bounce-in">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-foreground text-lg">Reading Complete! 🎉</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Great job! You finished in {formatTime(time)}. Ready for the writing test?
              </p>
              <div className="flex gap-3 mt-4">
                <Link href="/writing-test">
                  <Button className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25">
                    Writing Test <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/analysis">
                  <Button variant="outline" className="rounded-xl">
                    Skip to Analysis
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
