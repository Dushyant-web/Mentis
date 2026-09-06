"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight, ArrowLeft, Star, Loader2, RotateCcw, Volume2, Eye, XCircle, Lightbulb, BookOpen, Target, PenTool, Mic, PenLine } from "lucide-react";
import { useEyeTracking } from "@/hooks/useEyeTracking";
import { api, API_BASE_URL } from "@/lib/api";

// ========================
// SHARED UTILS
// ========================

const analyzeCanvasOCR = async (canvasRef: React.RefObject<HTMLCanvasElement | null>, targetWord: string) => {
  if (!canvasRef.current) return { success: false, text: "error" };
  
  // 🧠 ENHANCEMENT: Fill white background for better OCR contrast (EasyOCR prefers clean backgrounds)
  const canvas = canvasRef.current;
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext("2d");
  if (tempCtx) {
    tempCtx.fillStyle = "white";
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.drawImage(canvas, 0, 0);
  }
  
  const image = tempCanvas.toDataURL("image/jpeg", 0.9);
  try {
    return await api.post("/assessment/analyze-canvas", {
      image,
      target_word: targetWord
    });
  } catch (e) {
    console.error(e);
    return { success: false, text: "error" };
  }
};

// ========================
// EXERCISE RENDERERS
// ========================

function WordCopyExercise({ items, onComplete, mode }: { items: any[]; onComplete: (score: number) => void; mode?: string }) {
  const [current, setCurrent] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [results, setResults] = useState<{ word: string; input: string; correct: boolean }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [audioPlayed, setAudioPlayed] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [ocrFeedback, setOcrFeedback] = useState<{text: string; isCorrect: boolean; message?: string} | null>(null);

  const isDictation = mode === "dictation";
  const isLetterPattern = mode === "letter_pattern";

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    setUserInput("");
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | any) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    
    // Calculate scaling factors between CSS and internal resolution
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    let x, y;

    if (e.touches && e.touches.length > 0) {
      x = (e.touches[0].clientX - rect.left) * scaleX;
      y = (e.touches[0].clientY - rect.top) * scaleY;
    } else {
      x = (e.clientX - rect.left) * scaleX;
      y = (e.clientY - rect.top) * scaleY;
    }
    return { x, y };
  };

  const handleDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || !isDrawing) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const playAudio = () => {
    const item = items[current];
    const text = item.audio_text || item.text || item.word || item.target_word || "";
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.85;
      u.pitch = 1;
      window.speechSynthesis.speak(u);
      setAudioPlayed(true);
    }
  };

  const getTarget = () => {
    const item = items[current];
    if (isLetterPattern) return item.letter || item.pair || "";
    return item.word || item.target_word || item.text || "";
  };

  const submitWord = async () => {
    if (isAnalyzing) return;
    const target = getTarget();

    // OCR Analysis Branch
    setIsAnalyzing(true);
    const result = await analyzeCanvasOCR(canvasRef, target);
    setIsAnalyzing(false);

    if (result && result.success) {
      if (result.is_correct) {
        setOcrFeedback({ text: result.text, isCorrect: true });
        // Correct - move to next after 1.5s
        const newResults = [...results, { word: target, input: result.text, correct: true }];
        setResults(newResults);
        
        setTimeout(() => {
          if (current < items.length - 1) {
            setCurrent(current + 1);
            clearCanvas();
            setAudioPlayed(false);
            setOcrFeedback(null);
          } else {
            const score = Math.round((newResults.filter(r => r.correct).length / newResults.length) * 100);
            onComplete(score);
          }
        }, 1500);
      } else {
        // Failed - user must retry
        setOcrFeedback({ 
          text: result.text || "?", 
          isCorrect: false,
          message: result.text ? `We read "${result.text}". Try drawing larger and clearer.` : "Couldn't read yours. Please draw clearly and try again."
        });
      }
    } else {
      setOcrFeedback({ text: "Error", isCorrect: false, message: "Connection issue. Please try again." });
    }
  };

  const item = items[current];
  if (!item) return null;

  const target = getTarget();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">
          {isLetterPattern ? `Letter ${current + 1} of ${items.length}` : `Word ${current + 1} of ${items.length}`}
        </p>

        {/* Dictation: Audio button instead of showing the word */}
        {isDictation ? (
          <div className="py-4">
            <button onClick={playAudio}
              className="w-20 h-20 mx-auto rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center hover:bg-primary/20 transition-all active:scale-95">
              <Volume2 className="w-8 h-8 text-primary" />
            </button>
            <p className="text-sm text-muted-foreground mt-3 inline-flex items-center gap-1.5">
              {audioPlayed ? (<><PenTool className="w-4 h-4" /> Listen again or start writing</>) : (<><Volume2 className="w-4 h-4" /> Tap to hear the word</>)}
            </p>
          </div>
        ) : isLetterPattern ? (
          /* Letter Pattern: Show letter big with guide */
          <div className="py-4">
            <div className="w-28 h-28 mx-auto rounded-2xl border-3 border-primary/30 bg-primary/5 flex items-center justify-center mb-3">
              <span className="text-7xl font-bold font-mono text-foreground">{target}</span>
            </div>
            {item.guide && (
              <p className="text-sm text-blue-700 bg-blue-50 inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-blue-200">
                <Lightbulb className="w-4 h-4" /> {item.guide}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              Write this letter {item.repeat ? `${item.repeat} times` : ""} on the canvas, then type it
            </p>
          </div>
        ) : (
          /* Normal: Show target word */
          <>
            <p className="text-4xl font-bold text-foreground font-mono tracking-widest">
              {target}
            </p>
            <p className="text-sm text-muted-foreground mt-2">Write this word on the canvas below, then type it</p>
          </>
        )}
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={400} height={150}
          className={cn(
            "w-full border-2 border-dashed rounded-xl bg-white cursor-crosshair touch-none transition-colors",
            ocrFeedback?.isCorrect ? "border-green-400 bg-green-50/50" : 
            ocrFeedback && !ocrFeedback.isCorrect ? "border-red-400 bg-red-50/50" : "border-border"
          )}
          onMouseDown={startDraw}
          onMouseMove={handleDraw}
          onMouseUp={() => setIsDrawing(false)}
          onMouseLeave={() => setIsDrawing(false)}
          onTouchStart={startDraw}
          onTouchMove={handleDraw}
          onTouchEnd={() => setIsDrawing(false)}
        />
        {isAnalyzing && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center rounded-xl z-10">
            <div className="flex items-center gap-2 font-semibold text-primary">
              <Loader2 className="w-5 h-5 animate-spin" /> Reading Handwriting...
            </div>
          </div>
        )}
      </div>

      {ocrFeedback && (
        <div className={cn(
          "p-4 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-1 duration-300",
          ocrFeedback.isCorrect ? "bg-green-100 text-green-700 border border-green-200" : "bg-red-100 text-red-700 border border-red-200 text-center"
        )}>
          {ocrFeedback.isCorrect ? (
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Perfect! We read "{ocrFeedback.text}"</span>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <span>{ocrFeedback.message || `Oops, we read "${ocrFeedback.text}". Please clear and try again.`}</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <Button onClick={() => { clearCanvas(); setOcrFeedback(null); }} variant="outline" className="rounded-xl flex-1 max-w-[120px]">
          <RotateCcw className="w-4 h-4 mr-1" /> Clear
        </Button>
        <Button disabled={isAnalyzing || ocrFeedback?.isCorrect} onClick={submitWord} className="rounded-xl bg-primary text-primary-foreground flex-1">
          {isAnalyzing ? "Reading..." : "Check Handwriting"} <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      <div className="flex gap-1">
        {items.map((_: any, i: number) => (
          <div key={i} className={cn(
            "h-1.5 flex-1 rounded-full transition-all",
            i < current ? "bg-primary" : i === current ? "bg-primary/40" : "bg-secondary"
          )} />
        ))}
      </div>
    </div>
  );
}

function MCQExercise({ items, onComplete }: { items: any[]; onComplete: (score: number) => void }) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correct, setCorrect] = useState(0);

  const item = items[current];
  if (!item) return null;

  const handleSelect = (opt: string) => {
    if (showResult) return;
    setSelected(opt);
    setShowResult(true);
    if (opt === item.answer) setCorrect(c => c + 1);

    setTimeout(() => {
      if (current < items.length - 1) {
        setCurrent(current + 1);
        setSelected(null);
        setShowResult(false);
      } else {
        const finalCorrect = opt === item.answer ? correct + 1 : correct;
        onComplete(Math.round((finalCorrect / items.length) * 100));
      }
    }, 1200);
  };

  const question = item.question || item.sentence || `What comes next: ${(item.sequence || []).join(" ")}`;
  const options = item.options || [];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-1">Question {current + 1} of {items.length}</p>
      </div>

      {/* Passage Text (for comprehension exercises) */}
      {item.text && (
        <div className="bg-gradient-to-b from-blue-50/50 to-transparent border border-blue-200/40 rounded-2xl p-5 mb-4">
          {item.title && (
            <p className="text-xs font-bold uppercase tracking-wider text-blue-500 mb-2 inline-flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> {item.title}</p>
          )}
          <p className="text-base text-foreground leading-relaxed whitespace-pre-line">{item.text}</p>
        </div>
      )}

      <div className="bg-card border rounded-2xl p-6">
        <p className="text-lg font-semibold text-foreground text-center">{question}</p>
        {item.sequence && (
          <div className="flex items-center justify-center gap-2 mt-3">
            {item.sequence.map((s: string, i: number) => (
              <span key={i} className={cn(
                "px-3 py-2 rounded-lg font-mono font-bold text-lg",
                s === "?" ? "bg-primary/20 text-primary border-2 border-primary/30" : "bg-secondary"
              )}>{s}</span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt: string, i: number) => (
          <button key={i}
            onClick={() => handleSelect(opt)}
            className={cn(
              "p-4 rounded-xl border-2 text-left font-medium transition-all text-base",
              showResult && opt === item.answer
                ? "border-green-500 bg-green-50 text-green-800"
                : showResult && selected === opt && opt !== item.answer
                ? "border-red-500 bg-red-50 text-red-800"
                : selected === opt
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-primary/40 hover:bg-primary/5"
            )}
          >
            <span className="text-xs text-muted-foreground mr-2">{String.fromCharCode(65 + i)}.</span>
            {opt}
          </button>
        ))}
      </div>

      <div className="flex gap-1">
        {items.map((_, i) => (
          <div key={i} className={cn(
            "h-1.5 flex-1 rounded-full transition-all",
            i < current ? "bg-primary" : i === current ? "bg-primary/40" : "bg-secondary"
          )} />
        ))}
      </div>
    </div>
  );
}

function RhythmExercise({ items, onComplete }: { items: any[]; onComplete: (score: number) => void }) {
  const [current, setCurrent] = useState(0);
  const [phase, setPhase] = useState<"waiting" | "playing" | "done">("waiting");
  const [taps, setTaps] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [pulse, setPulse] = useState(false);
  const requestRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const lastPulseRef = useRef(0);

  const item = items[current];
  if (!item) return null;

  const bpm = item.bpm || 60;
  const beats = item.beats || 10;
  const intervalMs = 60000 / bpm;

  const animate = useCallback((time: number) => {
    if (startTimeRef.current === 0) startTimeRef.current = time;
    const elapsed = time - startTimeRef.current;
    
    // Check if it's time for a new pulse
    const currentBeat = Math.floor(elapsed / intervalMs);
    if (currentBeat > lastPulseRef.current) {
      lastPulseRef.current = currentBeat;
      setPulse(true);
      setTimeout(() => setPulse(false), 150);
      
      if (currentBeat >= beats) {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        setTimeout(() => {
          setPhase("done");
          // Calculate score based on tap timing accuracy
          const accuracy = Math.min(100, Math.round((taps.length / beats) * 100));
          setScore(accuracy);
        }, 1000);
        return;
      }
    }
    
    requestRef.current = requestAnimationFrame(animate);
  }, [beats, intervalMs, taps.length]);

  const startRhythm = () => {
    setPhase("playing");
    setTaps([]);
    startTimeRef.current = 0;
    lastPulseRef.current = -1;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const handleTap = () => {
    if (phase !== "playing") return;
    const elapsed = Date.now() - startTimeRef.current;
    setTaps(prev => [...prev, elapsed]);
  };

  const nextItem = () => {
    if (current < items.length - 1) {
      setCurrent(current + 1);
      setPhase("waiting");
      setTaps([]);
    } else {
      onComplete(score);
    }
  };



  return (
    <div className="space-y-6 text-center">
      <p className="text-sm text-muted-foreground">Round {current + 1} of {items.length}</p>
      <p className="text-lg font-semibold">{item.label || `${bpm} BPM`}</p>
      
      {phase === "waiting" && (
        <Button onClick={startRhythm} size="lg" className="rounded-2xl px-8 py-6 text-lg">
          Start Rhythm
        </Button>
      )}

      {phase === "playing" && (
        <div className="space-y-6">
          <button
            onClick={handleTap}
            className={cn(
              "w-40 h-40 mx-auto rounded-full flex items-center justify-center text-white text-2xl font-bold transition-all duration-100",
              pulse ? "bg-primary scale-110 shadow-xl shadow-primary/30" : "bg-primary/70 scale-100"
            )}
          >
            TAP!
          </button>
          <p className="text-sm text-muted-foreground">
            Taps: {taps.length} / {beats} beats
          </p>
        </div>
      )}

      {phase === "done" && (
        <div className="space-y-4">
          <div className="text-5xl font-bold text-primary">{score}%</div>
          <p className="text-muted-foreground">You hit {taps.length} of {beats} beats</p>
          <Button onClick={nextItem} className="rounded-xl">
            {current < items.length - 1 ? "Next Round" : "Finish"} <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

function FlashcardExercise({ items, onComplete }: { items: any[]; onComplete: (score: number) => void }) {
  const [current, setCurrent] = useState(0);
  const [phase, setPhase] = useState<"show" | "input" | "result">("show");
  const [userInput, setUserInput] = useState("");
  const [correct, setCorrect] = useState(0);

  const item = items[current];
  if (!item) return null;
  const displayTime = item.display_time_ms || 1000;

  useEffect(() => {
    if (phase === "show") {
      const timer = setTimeout(() => setPhase("input"), displayTime);
      return () => clearTimeout(timer);
    }
  }, [phase, displayTime]);

  const submit = () => {
    const target = (item.word || item.sequence || "").toLowerCase();
    const isCorrect = userInput.toLowerCase().trim() === target;
    if (isCorrect) setCorrect(c => c + 1);
    setPhase("result");

    setTimeout(() => {
      if (current < items.length - 1) {
        setCurrent(current + 1);
        setUserInput("");
        setPhase("show");
      } else {
        const finalCorrect = isCorrect ? correct + 1 : correct;
        onComplete(Math.round((finalCorrect / items.length) * 100));
      }
    }, 1500);
  };

  return (
    <div className="space-y-6 text-center">
      <p className="text-sm text-muted-foreground">Card {current + 1} of {items.length}</p>

      {phase === "show" && (
        <div className="py-12">
          <p className="text-5xl font-bold font-mono tracking-widest text-foreground animate-pulse">
            {item.word || item.sequence}
          </p>
          <p className="text-sm text-muted-foreground mt-4">Remember this!</p>
        </div>
      )}

      {phase === "input" && (
        <div className="space-y-4">
          <p className="text-lg text-muted-foreground">What word was shown?</p>
          <input
            type="text" autoFocus
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()}
            placeholder="Type the word..."
            className="w-full max-w-xs mx-auto px-4 py-3 border border-border rounded-xl text-lg font-mono text-center bg-card focus:ring-2 focus:ring-primary/30 outline-none"
          />
          <Button onClick={submit} className="rounded-xl">Submit</Button>
        </div>
      )}

      {phase === "result" && (
        <div className="py-8">
          <p className={cn(
            "text-2xl font-bold",
            userInput.toLowerCase().trim() === (item.word || item.sequence || "").toLowerCase()
              ? "text-green-600" : "text-red-600"
          )}>
            {userInput.toLowerCase().trim() === (item.word || item.sequence || "").toLowerCase()
              ? (<span className="inline-flex items-center gap-1.5"><CheckCircle className="w-4 h-4" /> Correct!</span>)
              : (<span className="inline-flex items-center gap-1.5"><XCircle className="w-4 h-4" /> It was "{item.word || item.sequence}"</span>)}
          </p>
        </div>
      )}

      <div className="flex gap-1">
        {items.map((_, i) => (
          <div key={i} className={cn(
            "h-1.5 flex-1 rounded-full",
            i < current ? "bg-primary" : i === current ? "bg-primary/40" : "bg-secondary"
          )} />
        ))}
      </div>
    </div>
  );
}

function PatternExercise({ items, onComplete }: { items: any[]; onComplete: (score: number) => void }) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correct, setCorrect] = useState(0);

  const item = items[current];
  if (!item) return null;

  const handleSelect = (opt: string) => {
    if (showResult) return;
    setSelected(opt);
    setShowResult(true);
    if (opt === item.answer) setCorrect(c => c + 1);
    setTimeout(() => {
      if (current < items.length - 1) {
        setCurrent(current + 1);
        setSelected(null);
        setShowResult(false);
      } else {
        const finalCorrect = opt === item.answer ? correct + 1 : correct;
        onComplete(Math.round((finalCorrect / items.length) * 100));
      }
    }, 1200);
  };

  return (
    <div className="space-y-6 text-center">
      <p className="text-sm text-muted-foreground">Pattern {current + 1} of {items.length}</p>
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {(item.sequence || []).map((s: string, i: number) => (
          <span key={i} className={cn(
            "px-4 py-3 rounded-xl font-mono font-bold text-xl",
            s === "?" ? "bg-primary/20 text-primary border-2 border-dashed border-primary" : "bg-card border"
          )}>{s}</span>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
        {(item.options || []).map((opt: string, i: number) => (
          <button key={i} onClick={() => handleSelect(opt)}
            className={cn(
              "p-4 rounded-xl border-2 font-mono font-bold text-xl transition-all",
              showResult && opt === item.answer ? "border-green-500 bg-green-50" :
              showResult && selected === opt ? "border-red-500 bg-red-50" :
              "border-border bg-card hover:border-primary/40"
            )}>{opt}</button>
        ))}
      </div>
    </div>
  );
}

function LetterPairExercise({ items, onComplete }: { items: any[]; onComplete: (score: number) => void }) {
  const [current, setCurrent] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Expand items: if items have sub-exercises, flatten them
  const expandedItems = items.flatMap(item => {
    if (item.exercises && Array.isArray(item.exercises)) {
      return item.exercises.map((ex: any) => ({
        ...item,
        drill_type: ex.type,
        instruction: ex.instruction || item.instruction,
      }));
    }
    return [item];
  });

  const allItems = expandedItems.length > 0 ? expandedItems : items;
  const item = allItems[current];
  if (!item) return null;

  // Extract letters from any format
  const getLetterA = () => {
    if (item.letter_a) return item.letter_a;
    if (item.pair && typeof item.pair === "string") {
      if (item.pair.includes("/")) return item.pair.split("/")[0];
      return item.pair[0] || "";
    }
    if (item.content && typeof item.content === "string") return item.content[0] || "";
    return "?";
  };
  const getLetterB = () => {
    if (item.letter_b) return item.letter_b;
    if (item.pair && typeof item.pair === "string") {
      if (item.pair.includes("/")) return item.pair.split("/")[1];
      return item.pair[1] || "";
    }
    if (item.content && typeof item.content === "string") return item.content[1] || "";
    return "?";
  };

  const letterA = getLetterA();
  const letterB = getLetterB();

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const handleDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ("touches" in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ("touches" in e ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.strokeStyle = "#1a1a1a";
    ctx.lineTo(x, y); ctx.stroke();
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ("touches" in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ("touches" in e ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.beginPath(); ctx.moveTo(x, y);
  };

  const next = () => {
    clearCanvas();
    if (current < allItems.length - 1) setCurrent(current + 1);
    else onComplete(100);
  };

  return (
    <div className="space-y-6 text-center">
      <p className="text-sm text-muted-foreground">Pair {current + 1} of {allItems.length}</p>
      
      <div className="flex items-center justify-center gap-6">
        <div className="w-24 h-24 flex items-center justify-center rounded-2xl border-3 border-primary/30 bg-primary/5">
          <span className="text-6xl font-bold" style={{ fontFamily: "monospace", color: "#1a1a1a" }}>
            {letterA}
          </span>
        </div>
        <span className="text-xl font-bold text-muted-foreground">VS</span>
        <div className="w-24 h-24 flex items-center justify-center rounded-2xl border-3 border-orange-300 bg-orange-50">
          <span className="text-6xl font-bold" style={{ fontFamily: "monospace", color: "#1a1a1a" }}>
            {letterB}
          </span>
        </div>
      </div>

      {item.hint && (
        <p className="text-sm text-amber-800 bg-amber-50 inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-amber-200">
          <Lightbulb className="w-4 h-4" /> {item.hint}
        </p>
      )}
      {item.instruction && (
        <p className="text-sm text-blue-700 bg-blue-50 inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-blue-200">
          <PenLine className="w-4 h-4" /> {item.instruction}
        </p>
      )}
      
      <p className="text-muted-foreground">
        Practice writing <strong className="text-foreground">"{letterA}"</strong> and <strong className="text-foreground">"{letterB}"</strong> on the canvas
      </p>
      
      <canvas ref={canvasRef} width={400} height={150}
        className="w-full border-2 border-dashed border-border rounded-xl bg-white cursor-crosshair touch-none"
        onMouseDown={startDraw} onMouseMove={handleDraw} onMouseUp={() => setIsDrawing(false)}
        onTouchStart={startDraw} onTouchMove={handleDraw} onTouchEnd={() => setIsDrawing(false)}
      />
      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={clearCanvas} className="rounded-xl"><RotateCcw className="w-4 h-4 mr-1" /> Clear</Button>
        <Button onClick={next} className="rounded-xl bg-primary text-primary-foreground">
          {current < allItems.length - 1 ? "Next Pair" : "Finish"} <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// Canvas drawing exercise for pressure_control, smooth_trace, precision_draw
function CanvasDrawExercise({ items, onComplete, mode }: { items: any[]; onComplete: (score: number) => void; mode?: string }) {
  const [current, setCurrent] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeCount, setStrokeCount] = useState(0);
  const [currentPressure, setCurrentPressure] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const item = items[current];

  // Configure timer
  useEffect(() => {
    if (item?.duration_seconds) {
      setTimeLeft(item.duration_seconds);
    } else {
      setTimeLeft(null);
    }
  }, [current, item]);

  // Handle countdown
  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      next(); // Auto advance when time runs out
      return;
    }
    const t = setTimeout(() => setTimeLeft(l => (l !== null ? l - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [timeLeft]);

  if (!item) return null;

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setStrokeCount(0);
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | any) => {
    if (!canvasRef.current) return { x: 0, y: 0, pressure: 0.5 };
    const rect = canvasRef.current.getBoundingClientRect();
    
    // Calculate scaling factors between CSS and internal resolution
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    let x, y, pressure = 0.5;

    if (e.touches && e.touches.length > 0) {
      x = (e.touches[0].clientX - rect.left) * scaleX;
      y = (e.touches[0].clientY - rect.top) * scaleY;
      pressure = e.touches[0].force !== undefined ? Math.max(0.1, e.touches[0].force) : 0.5;
    } else if (e.nativeEvent && 'pressure' in e.nativeEvent) {
      // Pointer events support native pressure
      x = (e.clientX - rect.left) * scaleX;
      y = (e.clientY - rect.top) * scaleY;
      pressure = e.nativeEvent.pressure > 0 ? e.nativeEvent.pressure : 0.5;
    } else {
      x = (e.clientX - rect.left) * scaleX;
      y = (e.clientY - rect.top) * scaleY;
    }
    return { x, y, pressure };
  };

  const handleDraw = (e: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    
    // Prevent scrolling window while drawing
    if ('touches' in e && typeof e.preventDefault === 'function') e.preventDefault();

    const { x, y, pressure } = getCoordinates(e);

    // If pressure control mode, vary the line width based on real pressure and log it to state
    if (mode === "pressure_control") {
      setCurrentPressure(pressure); // update state for the gauge
      const baseWidth = item.label?.toLowerCase() === "light" ? 1 :
                        item.label?.toLowerCase() === "heavy" ? 10 : 4;
      
      // Simulate/exaggerate pressure variance if hardware doesn't support it strictly
      ctx.lineWidth = baseWidth + (pressure * 6);
    } else {
      ctx.lineWidth = 3;
    }

    ctx.lineCap = "round";
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineTo(x, y); 
    ctx.stroke();
    
    // Start new segment if varying width to make it look smooth
    if (mode === "pressure_control") {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    setIsDrawing(true);
    setStrokeCount(s => s + 1);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !canvasRef.current) return;
    
    const { x, y } = getCoordinates(e);
    ctx.beginPath(); 
    ctx.moveTo(x, y);
  };

  const next = () => {
    clearCanvas();
    if (current < items.length - 1) setCurrent(current + 1);
    else onComplete(85 + Math.min(15, strokeCount));
  };

  const getLabel = () => {
    if (mode === "pressure_control") return item.label || "Draw with consistent pressure";
    if (mode === "precision_draw") return item.name || "Draw the shape";
    return item.name || "Trace the pattern";
  };

  const getInstruction = () => {
    if (mode === "pressure_control") return `Target: ${item.label || "steady"} pressure — draw smooth lines on the canvas`;
    if (mode === "precision_draw") return item.instruction || "Draw the shape as precisely as you can";
    return "Trace the pattern smoothly without jerky movements";
  };

  return (
    <div className="space-y-6 text-center">
      <p className="text-sm text-muted-foreground">Task {current + 1} of {items.length}</p>

      <div className="space-y-2">
        <h3 className="text-xl font-bold text-foreground">{getLabel()}</h3>
        <p className="text-sm text-muted-foreground">{getInstruction()}</p>
        
        {mode === "pressure_control" && item.zone_color && (
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.zone_color }} />
              <span className="text-sm font-medium" style={{ color: item.zone_color }}>
                Target zone: {item.label}
              </span>
              {timeLeft !== null && (
                <span className="text-xs font-bold px-2 py-0.5 bg-secondary rounded-full flex items-center gap-1">
                  ⏳ {timeLeft}s
                </span>
              )}
            </div>

            {/* Live Pressure Gauge */}
            <div className="w-full max-w-xs mt-2 relative">
              <p className="text-xs text-muted-foreground mb-1 font-medium tracking-wide uppercase">Live Pressure: {Math.round(currentPressure * 100)}%</p>
              <div className="h-4 w-full bg-secondary rounded-full overflow-hidden border border-border">
                <div 
                  className={cn("h-full transition-all duration-75", 
                    currentPressure > 0.7 ? "bg-red-500" : currentPressure > 0.4 ? "bg-orange-400" : "bg-blue-400"
                  )}
                  style={{ width: `${Math.round(currentPressure * 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {mode === "precision_draw" && item.guide && (
          <div className="inline-flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full border border-blue-200">
            <span className="text-sm text-blue-700 inline-flex items-center gap-1.5"><Target className="w-4 h-4" /> Shape: <strong>{item.guide}</strong> ({item.size || 80}px)</span>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} width={500} height={250}
        className="w-full border-2 border-dashed border-border rounded-xl bg-white touch-none"
        style={{ cursor: "crosshair" }}
        onPointerDown={startDraw} onPointerMove={handleDraw} onPointerUp={() => {setIsDrawing(false); setCurrentPressure(0);}} onPointerLeave={() => {setIsDrawing(false); setCurrentPressure(0);}}
      />

      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={clearCanvas} className="rounded-xl"><RotateCcw className="w-4 h-4 mr-1" /> Clear</Button>
        <Button onClick={next} className="rounded-xl bg-primary text-primary-foreground">
          {current < items.length - 1 ? "Next Task" : "Finish"} <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      <div className="flex gap-1">
        {items.map((_: any, i: number) => (
          <div key={i} className={cn("h-1.5 flex-1 rounded-full", i < current ? "bg-primary" : i === current ? "bg-primary/40" : "bg-secondary")} />
        ))}
      </div>
    </div>
  );
}


// Multisensory exercise: Audio → Speech check → Canvas write
function MultisensoryExercise({ items, onComplete }: { items: any[]; onComplete: (score: number) => void }) {
  const [current, setCurrent] = useState(0);
  const [phase, setPhase] = useState<"see" | "hear" | "say" | "write">("see");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [ocrFeedback, setOcrFeedback] = useState<{text: string; isCorrect: boolean; message?: string} | null>(null);
  const [correct, setCorrect] = useState(0);
  const [listening, setListening] = useState(false);
  const [spokenWord, setSpokenWord] = useState("");

  const item = items[current];
  if (!item) return null;

  const word = item.word || "";

  // Auto-advance from "see" to "hear"
  useEffect(() => {
    if (phase === "see") {
      const timer = setTimeout(() => setPhase("hear"), item.step_1_see_ms || 2000);
      return () => clearTimeout(timer);
    }
  }, [phase, current]);

  const playAudio = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(word);
      u.rate = 0.8;
      window.speechSynthesis.speak(u);
      u.onend = () => setPhase("say");
    } else {
      setPhase("say");
    }
  };

  const recognitionRef = useRef<any>(null);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      // Fallback: skip speech check
      setPhase("write");
      return;
    }
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;
    setSpokenWord("");
    setListening(true);

    recognition.onresult = (event: any) => {
      const results = Array.from(event.results[0]).map((r: any) => r.transcript.toLowerCase().trim());
      const firstResult = results[0] || "";
      setSpokenWord(firstResult);
      setListening(false);
      
      // Check if any alternative matches
      const matched = results.some((r: string) => r === word.toLowerCase());
      if (matched) {
        setCorrect(c => c + 1);
        setTimeout(() => setPhase("write"), 2000); // 2 seconds so they can read "Correct!"
      }
    };
    recognition.onerror = (e: any) => {
      console.error("Speech error", e.error);
      setSpokenWord("__error__");
      setListening(false);
    };
    recognition.onend = () => {
      // If it ends without triggering onresult or onerror
      setListening(prev => {
        if (prev) {
           setSpokenWord("__error__");
        }
        return false;
      });
    };
    recognition.start();
  };

  const forceSkipListening = () => {
    if (recognitionRef.current && listening) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    setListening(false);
    setPhase("write");
  };

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | any) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    
    // Calculate scaling factors between CSS and internal resolution
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    let x, y;

    if (e.touches && e.touches.length > 0) {
      x = (e.touches[0].clientX - rect.left) * scaleX;
      y = (e.touches[0].clientY - rect.top) * scaleY;
    } else {
      x = (e.clientX - rect.left) * scaleX;
      y = (e.clientY - rect.top) * scaleY;
    }
    return { x, y };
  };

  const handleDraw = (e: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    if ('touches' in e && typeof e.preventDefault === 'function') e.preventDefault();
    const { x, y } = getCoordinates(e);
    ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.strokeStyle = "#1a1a1a";
    ctx.lineTo(x, y); ctx.stroke();
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    setIsDrawing(true);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !canvasRef.current) return;
    const { x, y } = getCoordinates(e);
    ctx.beginPath(); ctx.moveTo(x, y);
  };

  const submitWrite = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    const result = await analyzeCanvasOCR(canvasRef, word);
    setIsAnalyzing(false);

    if (result && result.success) {
      if (result.is_correct || result.text.toLowerCase().trim() === word.toLowerCase()) {
        setOcrFeedback({ text: result.text, isCorrect: true });
        setCorrect(c => c + 1);
        
        setTimeout(() => {
          if (current < items.length - 1) {
            setCurrent(current + 1);
            setPhase("see");
            setSpokenWord("");
            setOcrFeedback(null);
            clearCanvas();
          } else {
            const finalCorrect = correct + 1;
            onComplete(Math.round((finalCorrect / (items.length * 2)) * 100)); // 2 checks per word
          }
        }, 1500);
      } else {
        setOcrFeedback({ 
          text: result.text || "?", 
          isCorrect: false,
          message: result.text ? `We read "${result.text}". Try drawing larger and clearer.` : "Couldn't read yours. Please draw clearly and try again."
        });
      }
    } else {
      setOcrFeedback({ text: "Error", isCorrect: false, message: "Connection issue. Please try again." });
    }
  };

  // Auto-advance from "see" to "hear"

  // Step indicator
  const steps = ["SEE", "HEAR", "SAY", "WRITE"];
  const stepIdx = steps.indexOf(phase.toUpperCase());

  return (
    <div className="space-y-6 text-center">
      <p className="text-sm text-muted-foreground">Word {current + 1} of {items.length}</p>

      {/* Step indicators */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className={cn(
            "flex items-center gap-1",
          )}>
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
              i <= stepIdx ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            )}>{i + 1}</div>
            <span className={cn("text-xs font-medium", i <= stepIdx ? "text-primary" : "text-muted-foreground")}>{s}</span>
            {i < 3 && <div className={cn("w-6 h-0.5 mx-1", i < stepIdx ? "bg-primary" : "bg-secondary")} />}
          </div>
        ))}
      </div>

      {/* PHASE: SEE */}
      {phase === "see" && (
        <div className="py-12">
          <p className="text-6xl font-bold font-mono text-foreground animate-pulse">{word}</p>
          <p className="text-sm text-muted-foreground mt-4 inline-flex items-center gap-1.5"><Eye className="w-4 h-4" /> Study this word carefully...</p>
        </div>
      )}

      {/* PHASE: HEAR */}
      {phase === "hear" && (
        <div className="py-8 space-y-4">
          <p className="text-lg text-muted-foreground">Now listen to the word</p>
          <button onClick={playAudio}
            className="w-24 h-24 mx-auto rounded-full bg-blue-100 border-2 border-blue-300 flex items-center justify-center hover:bg-blue-200 transition-all active:scale-95">
            <Volume2 className="w-10 h-10 text-blue-600" />
          </button>
          <p className="text-sm text-muted-foreground inline-flex items-center gap-1.5">Tap to hear <Volume2 className="w-4 h-4" /></p>
        </div>
      )}

      {/* PHASE: SAY */}
      {phase === "say" && (
        <div className="py-8 space-y-4">
          <p className="text-lg text-muted-foreground">Now say the word out loud</p>
          {!listening && (
            <button onClick={startListening}
              className={cn("w-24 h-24 mx-auto rounded-full border-2 flex items-center justify-center transition-all active:scale-95",
                spokenWord && spokenWord !== "__error__" && spokenWord.toLowerCase() === word.toLowerCase() ? "bg-green-100 border-green-300" :
                "bg-blue-100 border-blue-300 hover:bg-blue-200"
              )}>
              <Mic className="w-8 h-8 text-blue-600" />
            </button>
          )}
          {listening && (
            <div className="py-4 cursor-pointer hover:opacity-80" onClick={forceSkipListening} title="Click to skip">
              <div className="w-24 h-24 mx-auto rounded-full bg-red-100 border-2 border-red-300 flex items-center justify-center animate-pulse">
                <Mic className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-sm text-red-600 mt-2">Listening... (Tap to skip)</p>
            </div>
          )}
          {spokenWord && (
            <div className="py-4">
              <p className={cn("text-2xl font-bold", 
                spokenWord === "__error__" ? "text-red-500" :
                spokenWord.toLowerCase() === word.toLowerCase() ? "text-green-600" : "text-orange-600")}>
                
                {spokenWord === "__error__" ? `Didn't catch that. Tap mic to try again.` :
                 spokenWord.toLowerCase() === word.toLowerCase() ? `Correct! "${spokenWord}"` :
                 `You said: "${spokenWord}" (target: "${word}")`}
              </p>
            </div>
          )}
          
          <Button onClick={forceSkipListening} variant="outline" className="rounded-xl mt-2">
            {spokenWord && spokenWord !== "__error__" ? "Continue to Write →" : "Skip → Write"} 
          </Button>
        </div>
      )}

      {/* PHASE: WRITE */}
      {phase === "write" && (
        <div className="space-y-4">
          <p className="text-lg text-muted-foreground">Now write <strong className="text-foreground">"{word}"</strong> on the canvas</p>
          
          <div className="relative">
            <canvas ref={canvasRef} width={400} height={150}
              className={cn(
                "w-full border-2 border-dashed rounded-xl bg-white touch-none transition-colors",
                ocrFeedback?.isCorrect ? "border-green-400 bg-green-50/50" : 
                ocrFeedback && !ocrFeedback.isCorrect ? "border-red-400 bg-red-50/50" : "border-border"
              )}
              style={{ cursor: "crosshair" }}
              onPointerDown={startDraw} onPointerMove={handleDraw} onPointerUp={() => setIsDrawing(false)} onPointerLeave={() => setIsDrawing(false)}
            />
            {isAnalyzing && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center rounded-xl z-10">
                <div className="flex items-center gap-2 font-semibold text-primary">
                  <Loader2 className="w-5 h-5 animate-spin" /> Verifying Writing...
                </div>
              </div>
            )}
          </div>

          {ocrFeedback && (
            <div className={cn(
              "p-4 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-1 duration-300",
              ocrFeedback.isCorrect ? "bg-green-100 text-green-700 border border-green-200" : "bg-red-100 text-red-700 border border-red-200 text-center"
            )}>
              {ocrFeedback.isCorrect ? (
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Perfect! We read "{ocrFeedback.text}"</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <XCircle className="w-5 h-5 text-red-500" />
                    <span>{ocrFeedback.message || `Oops, we read "${ocrFeedback.text}". Please clear and try again.`}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => {clearCanvas(); setOcrFeedback(null);}} className="rounded-xl flex-1 max-w-[120px]">
              <RotateCcw className="w-4 h-4 mr-1" /> Clear
            </Button>
            <Button disabled={isAnalyzing || ocrFeedback?.isCorrect} onClick={submitWrite} className="rounded-xl bg-primary text-primary-foreground flex-1">
              {isAnalyzing ? "Reading..." : "Check Writing"} <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-1">
        {items.map((_: any, i: number) => (
          <div key={i} className={cn("h-1.5 flex-1 rounded-full", i < current ? "bg-primary" : i === current ? "bg-primary/40" : "bg-secondary")} />
        ))}
      </div>
    </div>
  );
}


// Word Pair comparison exercise for pair_match
function WordPairExercise({ items, onComplete }: { items: any[]; onComplete: (score: number) => void }) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correct, setCorrect] = useState(0);

  const item = items[current];
  if (!item) return null;

  const areSame = item.word_a === item.word_b;

  const handleSelect = (answer: string) => {
    if (showResult) return;
    setSelected(answer);
    setShowResult(true);
    const isCorrect = (answer === "same" && areSame) || (answer === "different" && !areSame);
    if (isCorrect) setCorrect(c => c + 1);

    setTimeout(() => {
      if (current < items.length - 1) {
        setCurrent(current + 1);
        setSelected(null);
        setShowResult(false);
      } else {
        const finalCorrect = isCorrect ? correct + 1 : correct;
        onComplete(Math.round((finalCorrect / items.length) * 100));
      }
    }, 1200);
  };

  return (
    <div className="space-y-6 text-center">
      <p className="text-sm text-muted-foreground">Pair {current + 1} of {items.length}</p>

      <div className="flex items-center justify-center gap-8 py-6">
        <div className="px-8 py-6 rounded-2xl border-2 border-border bg-card shadow-sm">
          <span className="text-4xl font-bold font-mono text-foreground">{item.word_a}</span>
        </div>
        <span className="text-2xl text-muted-foreground">?</span>
        <div className="px-8 py-6 rounded-2xl border-2 border-border bg-card shadow-sm">
          <span className="text-4xl font-bold font-mono text-foreground">{item.word_b}</span>
        </div>
      </div>

      <p className="text-muted-foreground">Are these two words the <strong>same</strong> or <strong>different</strong>?</p>

      <div className="flex justify-center gap-4">
        <button onClick={() => handleSelect("same")}
          className={cn("px-8 py-4 rounded-xl border-2 font-bold text-lg transition-all",
            showResult && areSame ? "border-green-500 bg-green-50 text-green-800" :
            showResult && selected === "same" && !areSame ? "border-red-500 bg-red-50 text-red-800" :
            "border-border bg-card hover:border-primary/40"
          )}><span className="inline-flex items-center gap-2"><CheckCircle className="w-5 h-5" /> Same</span></button>
        <button onClick={() => handleSelect("different")}
          className={cn("px-8 py-4 rounded-xl border-2 font-bold text-lg transition-all",
            showResult && !areSame ? "border-green-500 bg-green-50 text-green-800" :
            showResult && selected === "different" && areSame ? "border-red-500 bg-red-50 text-red-800" :
            "border-border bg-card hover:border-primary/40"
          )}><span className="inline-flex items-center gap-2"><XCircle className="w-5 h-5" /> Different</span></button>
      </div>

      <div className="flex gap-1">
        {items.map((_: any, i: number) => (
          <div key={i} className={cn("h-1.5 flex-1 rounded-full", i < current ? "bg-primary" : i === current ? "bg-primary/40" : "bg-secondary")} />
        ))}
      </div>
    </div>
  );
}


// Reading flow exercise with word-by-word highlighting and tracking
function ReadingFlowExercise({ items, onComplete }: { items: any[]; onComplete: (score: number) => void }) {
  const [current, setCurrent] = useState(0);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [looking, setLooking] = useState(true);

  // Eye Tracking Integration
  const { videoRef } = useEyeTracking((data) => {
    // MediaPipe face mesh returns { irisLeft, irisRight, raw } or similar
    // Simple heuristic: if we get data frequently, they are looking at the screen.
    if (data && data.irisLeft) {
      setLooking(true);
    }
  });

  const item = items[current];
  if (!item) return null;
  const words = item.words || item.sentence?.split(" ") || [];
  const speed = item.highlight_speed_ms || 400;

  const startHighlight = () => {
    setPlaying(true);
    setHighlightIdx(0);
  };

  useEffect(() => {
    if (!playing || highlightIdx < 0) return;
    if (highlightIdx >= words.length) {
      setPlaying(false);
      return;
    }

    // ONLY advance the highlight if the user is looking at the screen
    if (!looking) return;

    const timer = setTimeout(() => setHighlightIdx(h => h + 1), speed);
    return () => clearTimeout(timer);
  }, [highlightIdx, playing, words.length, speed, looking]);

  const next = () => {
    setHighlightIdx(-1);
    setPlaying(false);
    if (current < items.length - 1) setCurrent(current + 1);
    else onComplete(90);
  };

  return (
    <div className="space-y-6 text-center">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Sentence {current + 1} of {items.length}</p>
        
        {/* Tracker Status Indicator */}
        <div className="flex items-center gap-2 px-3 py-1 bg-card border rounded-full text-xs font-semibold shadow-sm">
          {playing && !looking ? (
            <><Eye className="w-3.5 h-3.5 text-amber-500" /> <span className="text-amber-500">Look back to resume</span></>
          ) : (
            <><Eye className="w-3.5 h-3.5 text-green-500" /> <span className="text-muted-foreground">Tracking Active</span></>
          )}
        </div>
      </div>

      <div className={cn("bg-card border rounded-2xl p-6 min-h-[120px] flex gap-6 items-center justify-center transition-opacity duration-300", !looking && playing ? "opacity-30" : "opacity-100")}>
        {/* Hidden Video element needed for MediaPipe */}
        <video ref={videoRef} className="hidden" playsInline muted />

        <p className="text-xl leading-relaxed flex flex-wrap gap-1.5 justify-center">
          {words.map((w: string, i: number) => (
            <span key={i} className={cn(
              "px-1 py-0.5 rounded transition-all duration-200",
              i === highlightIdx ? "bg-primary text-primary-foreground font-bold scale-110 shadow-sm" :
              i < highlightIdx ? "text-muted-foreground" : "text-foreground"
            )}>{w}</span>
          ))}
        </p>
      </div>

      <div className="flex justify-center gap-3">
        {!playing && highlightIdx < 0 && (
          <Button onClick={startHighlight} className="rounded-xl px-8" size="lg">▶ Start Reading</Button>
        )}
        {!playing && highlightIdx >= words.length && (
          <Button onClick={next} className="rounded-xl bg-primary text-primary-foreground px-8" size="lg">
            {current < items.length - 1 ? "Next Sentence" : "Finish"} <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>

      <div className="flex gap-1">
        {items.map((_: any, i: number) => (
          <div key={i} className={cn("h-1.5 flex-1 rounded-full", i < current ? "bg-primary" : i === current ? "bg-primary/40" : "bg-secondary")} />
        ))}
      </div>
    </div>
  );
}


function GenericExercise({ content, onComplete }: { content: any; onComplete: (score: number) => void }) {
  const items = content?.items || [];
  const [viewed, setViewed] = useState(0);

  return (
    <div className="space-y-6 text-center">
      <p className="text-lg font-semibold">{content?.title}</p>
      <p className="text-muted-foreground">{content?.instruction}</p>
      {items.length > 0 && (
        <div className="space-y-2 max-w-md mx-auto text-left">
          {items.slice(0, viewed + 3).map((item: any, i: number) => (
            <div key={i} className="bg-card border rounded-xl p-4 text-sm">
              {item.word && <span className="font-mono font-bold text-lg">{item.word}</span>}
              {item.sentence && <span className="italic">{item.sentence}</span>}
              {item.text && <span>{item.text}</span>}
              {item.label && <span>{item.label}</span>}
              {item.name && !item.word && <span>{item.name}: {item.instruction || ""}</span>}
            </div>
          ))}
        </div>
      )}
      <Button onClick={() => items.length > viewed + 3 ? setViewed(v => v + 3) : onComplete(85)} className="rounded-xl">
        {items.length > viewed + 3 ? "Show More" : "Complete Exercise"} <ArrowRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}

// ========================
// MAIN PAGE
// ========================

export default function ExercisePage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [completionInfo, setCompletionInfo] = useState<any>(null);

  const taskId = params.id as string;

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const json = await api.get(`/training/exercise-content/${taskId}`);
        setData(json);
      } catch (err) {
        console.error("Failed to load exercise", err);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, [taskId]);

  const handleComplete = async (exerciseScore: number) => {
    setScore(exerciseScore);
    setCompleted(true);
    try {
      const json = await api.post(`/training/complete/${taskId}`, {});
      setCompletionInfo(json);
    } catch (e) {
      console.error("Failed to complete exercise", e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-2 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading exercise...
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="text-center py-20">
        <p className="text-lg text-muted-foreground">Exercise not found</p>
        <Button onClick={() => router.push("/training")} variant="outline" className="mt-4 rounded-xl">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Training
        </Button>
      </div>
    );
  }

  if (completed) {
    const levelLabel = completionInfo?.user_level === "advanced" ? "Advanced" :
                       completionInfo?.user_level === "intermediate" ? "Intermediate" : "Beginner";
    const levelColor = completionInfo?.user_level === "advanced" ? "text-purple-600 bg-purple-50 border-purple-200" :
                       completionInfo?.user_level === "intermediate" ? "text-blue-600 bg-blue-50 border-blue-200" :
                       "text-green-600 bg-green-50 border-green-200";
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-6 animate-fade-in-up">
        <div className="w-24 h-24 mx-auto rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-foreground">Exercise Complete!</h2>
        <div className="text-6xl font-bold text-primary">{score}%</div>
        <p className="text-muted-foreground">
          {score >= 80 ? "Excellent work! Keep it up!" :
           score >= 60 ? "Good effort! Practice makes perfect." :
           "Keep practicing — you'll improve!"}
        </p>
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-1.5">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            <span className="text-lg font-bold text-amber-700">+{completionInfo?.xp_earned || data.xp || 50} XP</span>
          </div>
          {completionInfo?.total_xp && (
            <span className="text-sm text-muted-foreground">({completionInfo.total_xp} total)</span>
          )}
        </div>
        {completionInfo?.user_level && (
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium ${levelColor}`}>
            Level: {levelLabel}
            {completionInfo.exercises_done && (
              <span className="text-xs opacity-70">· {completionInfo.exercises_done} exercises done</span>
            )}
          </div>
        )}
        {completionInfo?.difficulty_upgraded && (
          <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 text-sm text-violet-700">
            <span className="font-semibold">Level Up!</span> Your next exercises will be harder — difficulty increased to <span className="font-bold">{completionInfo.next_difficulty || "medium"}</span>
          </div>
        )}
        <Button onClick={() => router.push("/training")} className="rounded-xl px-8">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Training
        </Button>
      </div>
    );
  }

  const content = data.content || {};
  const items = content.items || [];
  const mode = data.mode || "";

  const renderExercise = () => {
    if (["copy_exact", "letter_pattern", "size_control", "speed_write", "sentence_write", "dictation", "memory_write"].includes(mode)) {
      return <WordCopyExercise items={items} onComplete={handleComplete} mode={mode} />;
    }
    if (["pressure_control", "smooth_trace", "precision_draw"].includes(mode)) {
      return <CanvasDrawExercise items={items} onComplete={handleComplete} mode={mode} />;
    }
    if (["multisensory"].includes(mode)) {
      return <MultisensoryExercise items={items} onComplete={handleComplete} />;
    }
    if (["pair_match"].includes(mode)) {
      return <WordPairExercise items={items} onComplete={handleComplete} />;
    }
    if (["follow_highlight", "no_backtrack"].includes(mode)) {
      return <ReadingFlowExercise items={items} onComplete={handleComplete} />;
    }
    if (["fill_blank", "comprehension", "phoneme_split"].includes(mode)) {
      return <MCQExercise items={items} onComplete={handleComplete} />;
    }
    if (["pattern_spot"].includes(mode)) {
      return <PatternExercise items={items} onComplete={handleComplete} />;
    }
    if (["tap_sync"].includes(mode)) {
      return <RhythmExercise items={items} onComplete={handleComplete} />;
    }
    if (["flashcards", "visual_memory"].includes(mode)) {
      return <FlashcardExercise items={items} onComplete={handleComplete} />;
    }
    if (["confusion_drill", "reversal_drill", "confusion_pair_drill"].includes(mode)) {
      return <LetterPairExercise items={items} onComplete={handleComplete} />;
    }
    return <GenericExercise content={content} onComplete={handleComplete} />;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push("/training")} className="rounded-xl">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Star className="w-4 h-4 text-amber-500" /> {data.xp || 0} XP
        </div>
      </div>

      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">{data.task_name}</h1>
        <p className="text-sm text-muted-foreground mt-1">{data.duration} • {data.difficulty}</p>
      </div>

      <div className="bg-card border rounded-2xl p-6 shadow-sm">
        {renderExercise()}
      </div>

      {content.tips && (
        <div className="bg-amber-50/50 border border-amber-200/50 rounded-xl p-4">
          <p className="text-xs font-semibold text-amber-800 mb-2 inline-flex items-center gap-1.5"><Lightbulb className="w-3.5 h-3.5" /> Tips</p>
          <ul className="space-y-1">
            {content.tips.map((tip: string, i: number) => (
              <li key={i} className="text-xs text-amber-700">• {tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
