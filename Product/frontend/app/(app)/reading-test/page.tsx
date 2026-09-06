"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useEyeTracking } from "@/hooks/useEyeTracking";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { Play, Square, RotateCcw, Camera, CheckCircle, ArrowRight, Eye, AlertCircle } from "lucide-react";
import { TrackingPreview } from "@/components/tracking/TrackingPreview";
import Link from "next/link";


export default function ReadingTestPage() {
  const [userData, setUserData] = useState<any>(null);
  const [userName, setUserName] = useState("User");
  const [currentTestIndex, setCurrentTestIndex] = useState(0);
  
  // Define tests inside component or use a function to get them with dynamic user name
  const getTests = () => [
    {
      id: "dot_tracking",
      label: "Step 1: Eye-Tracking Calibration",
      type: "dot",
      duration: 60,
    },
    {
      id: "three_letter_words",
      label: "Step 2: Word Recognition",
      type: "sentence",
      text: "CAT DOG SUN BOX SKY PEN FLY BOY TOY CUP RED HOT BIG LOW TOP RUN SIT JOY JAM BOX WEB PIN HAT NET BAT",
      duration: 120,
    },
    {
      id: "five_poems",
      label: "Step 3: Narrative Reading",
      type: "sentence",
      text: `The Happy Bee: A fuzzy bee upon the bloom, Flying through the garden room. He gathers honey sweet and gold, To keep him from the winter cold.

Little Boat: Sailing on the blue, blue sea, As happy as a boat can be. ${userName} watches from the shore, And hears the mighty ocean roar.

Morning Sun: Wake up now and see the light, After such a quiet night. The sun is rising in the sky, As the many birds go by.

Rain Check: Pitter patter on the glass, Watch the morning moments pass. Growing grass and flowers tall, Rain is good for one and all.

My Red Hat: I wear it on my head so high, Underneath the sunny sky. It keeps me cool and keeps me dry, As the summer days go by.`,
      duration: 300,
    },
    {
      id: "introduction",
      label: "Step 4: Personal Introduction",
      type: "sentence",
      text: `Hello ${userName}! Welcome to Mentis. My name is ${userName} and I am a good student. I like to read and learn new things every day. This assessment helps me understand how I process words and sentences. I am feeling focused and ready to continue.`,
      duration: 120,
    },
    {
      id: "hard_poems",
      label: "Step 5: Advanced Analysis",
      type: "sentence",
      text: `Silent Growth: A thought is a seed planted in the fertile mind waiting for the light of focus to become a mighty action.

Woven Time: Seconds are threads of light weaving into minutes and hours. ${userName} holds the loom making a pattern of life.

Inner Voice: Quiet as a morning mist steady as a mountain stone. It speaks without any words about the things that are true.

Crystal Hope: Fragile as a winter frost but strong as a diamond eye. It sees through the darkness to the sunrise far away.`,
      duration: 300,
    }
  ];

  const tests = getTests();
  const currentTest = tests[currentTestIndex] || tests[0];
  const words = currentTest?.text ? String(currentTest.text).split(/\s+/).filter(w => w.length > 0) : [];

  // Pre-calculate paragraph structure to maintain global word indexing across visual breaks
  const paragraphData = useMemo(() => {
    if (!currentTest?.text || currentTest.type === "dot") return [];
    const paras = String(currentTest.text).split(/\n\n+/);
    let count = 0;
    return paras.map(p => {
      const w = p.split(/\s+/).filter(x => x.length > 0);
      const start = count;
      count += w.length;
      return { words: w, startIndex: start };
    });
  }, [currentTest]);

  const [status, setStatus] = useState<"ready" | "running" | "finished">("ready");
  const [time, setTime] = useState(0);
  const [webcamOn, setWebcamOn] = useState(false);
  const [currentWord, setCurrentWord] = useState(-1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const dotRef = useRef<NodeJS.Timeout | null>(null);
  const statusRef = useRef(status);
  const [dotPos, setDotPos] = useState({ x: 0, y: 0 });

  const eyeDataRef = useRef<any[]>([]);
  const eyeLogRef = useRef(0); // throttle counter for console logging
  // 🔥 Prevent uncontrolled growth outside test lifecycle
  const MAX_EYE_SAMPLES = 5000;

  // Load user profile AND create session ONCE on mount
  useEffect(() => {
    setWebcamOn(true);
    async function initSession() {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // 🔥 FIX: Create assessment session ONCE (not on every sub-test)
        const startData = await api.get("/assessment/start");
        if (startData && startData.session_id) {
          localStorage.setItem("assessment_session_id", startData.session_id.toString());
        }

        // 🔥 RESET DATA FOR NEW SESSION
        localStorage.removeItem("pen_data");
        localStorage.removeItem("eye_tests");
        localStorage.removeItem("assessment_errors");

        // Load profile for personalized text
        const data = await api.get("/auth/profile");
        if (data && data.success) {
          setUserName(data.data.name || "User");
        }
      } catch (err) {
        console.error("Profile/session load error:", err);
      }
    }
    initSession();
  }, []);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);


  const { videoRef, status: trackingStatus } = useEyeTracking((data) => {
    // 🚫 Ignore data if test is not running
    if (!data || statusRef.current !== "running") return;

    // ✅ Keep consistent schema for backend (use `time`, not `timestamp`)
    eyeDataRef.current.push({
      x: data.x,
      y: data.y,
      time: data.time,
      velocity: data.velocity,
      type: data.type,
    });

    // 👁️ live console log (throttled) so it stays readable
    if (eyeLogRef.current === 0) {
      console.log(
        "%c 👁️  MENTIS EYE TELEMETRY — LIVE GAZE CAPTURE ",
        "background:linear-gradient(90deg,#2563eb,#60a5fa);color:#fff;font-weight:bold;font-size:13px;padding:4px 10px;border-radius:6px"
      );
    }
    if (++eyeLogRef.current % 15 === 0) {
      const v = data.velocity != null ? Number(data.velocity) : 0;
      const meter = "▉".repeat(Math.min(20, Math.round(v / 20)));
      console.log(
        `%c👁️ x:${String(Math.round(data.x)).padStart(4)} y:${String(Math.round(data.y)).padStart(4)}  ` +
          `vel:${String(Math.round(v)).padStart(4)} ${meter}  ${data.type ?? "-"}  (n=${eyeDataRef.current.length})`,
        "color:#3b82f6;font-family:monospace"
      );
    }

    // limit memory (avoid overflow bugs)
    if (eyeDataRef.current.length > MAX_EYE_SAMPLES) {
      eyeDataRef.current.shift();
    }
  });

  const stopTest = useCallback(async () => {
    if ((window as any).__testTimeout) {
      clearTimeout((window as any).__testTimeout);
    }
    if (dotRef.current) clearTimeout(dotRef.current);
    setStatus("finished");
    setWebcamOn(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrentWord(words.length);


    // ✅ Ensure full dataset is preserved (no accidental mutation)
    const events = [...eyeDataRef.current];

    // 👁️ per-test summary in console (pretty grid for demos)
    eyeLogRef.current = 0;
    if (events.length) {
      const vels = events.map((e) => e.velocity).filter((v) => v != null);
      const avgVel = vels.length ? vels.reduce((a, b) => a + b, 0) / vels.length : 0;
      const peakVel = vels.length ? Math.max(...vels) : 0;
      const fixations = events.filter((e) => e.type === "fixation").length;
      const saccades = events.filter((e) => e.type === "saccade").length;
      // regressions = backward (leftward) saccades → a key dyslexia reading marker
      let regressions = 0;
      for (let i = 1; i < events.length; i++) {
        if (events[i].type === "saccade" && events[i].x < events[i - 1].x - 15) regressions++;
      }
      const durMs = events[events.length - 1].time - events[0].time;
      console.log(
        `%c 👁️  EYE TEST "${currentTest.id}" — COMPLETE `,
        "background:#2563eb;color:#fff;font-weight:bold;padding:3px 8px;border-radius:5px"
      );
      console.table({
        samples: events.length,
        "duration (ms)": durMs,
        "avg velocity": +avgVel.toFixed(1),
        "peak velocity": +peakVel.toFixed(1),
        fixations,
        saccades,
        "regressions (backtracks)": regressions,
        "fixation %": +((fixations / events.length) * 100).toFixed(1),
      });
    }

    // store per test
    const existing = JSON.parse(localStorage.getItem("eye_tests") || "{}");
    existing[currentTest.id] = events;
    localStorage.setItem("eye_tests", JSON.stringify(existing));
    // 🔥 FIX: Also store session_id for recovery
    const sid = localStorage.getItem("assessment_session_id");
    if (sid) localStorage.setItem("session_id", sid);



    if (currentTestIndex < tests.length - 1) {
      setCurrentTestIndex((prev) => prev + 1);
      eyeDataRef.current.length = 0;
      setCurrentWord(-1);
      setTime(0);
      setStatus("ready");
      return;
    } else {
      sessionStorage.setItem("reading_done_in_session", "true");
    }
  }, [currentTest.id, currentTestIndex, tests.length, words.length]);

  const startTest = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.warn("No token found. Skipping backend session start.");
      }

      // 🔥 FIX: Session already created on mount. No duplicate /assessment/start call.
      // Session ID is stored in localStorage under 'assessment_session_id'.

      // reset dot
      setDotPos({ x: 0, y: 0 });
      // clear any previous dot movement loop
      if (dotRef.current) {
        clearTimeout(dotRef.current);
      }

      setWebcamOn(true);
      // 🔥 Force immediate UI update
      setStatus("running");

      await new Promise((r) => setTimeout(r, 0));


      setCurrentWord(0);
      // 🔥 Reset properly before starting (prevents leftover contamination)
      eyeDataRef.current.length = 0;
      setTime(0);

      timerRef.current = setInterval(() => {
        setTime((t) => t + 1);
      }, 1000);

      // Dot movement logic (random positions)
      if (currentTest.type === "dot") {
        let elapsed = 0;

        const moveDot = () => {
          // always check latest state
          if (statusRef.current !== "running") return;

          elapsed += 1;

          const speed = 1200; // MUCH slower for stage 3 accessibility

          const containerWidth = window.innerWidth * 0.4;
          const containerHeight = 200;

          const newX = Math.random() * containerWidth - containerWidth / 2;
          const newY = Math.random() * containerHeight - containerHeight / 2;


          setDotPos({ x: newX, y: newY });

          dotRef.current = setTimeout(moveDot, speed);
        };

        // IMPORTANT: delay first call slightly so React state updates first
        setTimeout(() => {
          moveDot();
        }, 50);
      }

      // Auto stop based on duration
      const duration = (currentTest as any).duration || 180;

      // clear any previous auto-stop
      if ((window as any).__testTimeout) {
        clearTimeout((window as any).__testTimeout);
      }
      (window as any).__testTimeout = setTimeout(() => {
        stopTest();
      }, duration * 1000);

    } catch (err) {
      console.error("START ERROR:", err);
    }
  }, [currentTest.type, currentTest.id, stopTest]);

  const resetTest = useCallback(() => {
    setStatus("ready");
    setTime(0);
    setCurrentWord(-1);
    setWebcamOn(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (dotRef.current) clearTimeout(dotRef.current)
    if ((window as any).__testTimeout) {
      clearTimeout((window as any).__testTimeout);
    }
    eyeDataRef.current.length = 0;
  }, []);

  // Simulate word-by-word reading progression
  useEffect(() => {
    if (status !== "running" || currentTest.type === "dot") return;
    const interval = setInterval(() => {
      setCurrentWord((prev) => {
        if (prev >= words.length - 1) {
          stopTest();
          return prev;
        }
        return prev + 1;
      });
    }, 800); // slower word progression (0.8s vs 0.5s)
    return () => clearInterval(interval);
  }, [status, stopTest, words.length, currentTest.type]);

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
    <>
      <style jsx>{`
        @keyframes moveDot {
          0% { transform: translateX(-120px); }
          100% { transform: translateX(120px); }
        }
      `}</style>
      <div className="max-w-7xl mx-auto px-4 lg:px-8 space-y-8 pb-20">
        <video ref={videoRef} className="hidden" />
        
        {/* Main 2-Column Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8 items-start">
          
          {/* 🧩 LEFT COLUMN: Test Header, Controls, and Reading Area (7/10) */}
          <div className="lg:col-span-7 space-y-6">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3"
            style={{ fontFamily: "var(--font-fredoka)" }}>
            {currentTest.label || "Reading Test"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {`Step ${currentTestIndex + 1} of ${tests.length}`}
          </p>

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
              "w-10 h-10 rounded-xl flex items-center justify-center relative transition-all duration-500",
              trackingStatus.isFaceDetected && !trackingStatus.isOutOfFrame ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
            )}>
              <Camera className={cn("w-5 h-5", trackingStatus.isFaceDetected && !trackingStatus.isOutOfFrame ? "text-emerald-600" : "text-red-500")} />
              {trackingStatus.isFaceDetected && !trackingStatus.isOutOfFrame && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse border-2 border-white" />
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Eye Tracking</p>
              <p className={cn("text-sm font-semibold", trackingStatus.isFaceDetected && !trackingStatus.isOutOfFrame ? "text-emerald-600" : "text-red-500")}>
                {trackingStatus.isFaceDetected && !trackingStatus.isOutOfFrame ? "Secure" : "Re-align Face"}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {status === "ready" && (
              <Button onClick={() => {
                if (!webcamOn) setWebcamOn(true);
                startTest();
              }}
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
          <div className="relative bg-card rounded-3xl border border-border/50 shadow-sm overflow-hidden opacity-0 animate-fade-in-up"
            style={{ animationDelay: "400ms" }}>
            
            {/* Reading progress bar */}
            <div className="h-2 bg-secondary/30">
            <div
              className="h-full bg-primary rounded-full transition-all duration-150"
              style={{
                width:
                  currentTest.type === "dot"
                    ? `${status === "running" ? 100 : 0}%`
                    : `${words.length > 0 && currentWord >= 0 ? ((currentWord + 1) / words.length) * 100 : 0}%`
              }}
            />
          </div>

          <div className="p-8 lg:p-12">
            {currentTest.type === "dot" && (
              <div className="flex flex-col justify-center items-center h-64 gap-4">
                {status === "ready" && (
                  <p className="text-muted-foreground text-lg">
                    Follow the moving dot with your eyes
                  </p>
                )}
                {(status === "running" || status === "ready") && (
                  <div
                    className="w-6 h-6 bg-primary rounded-full transition-all duration-700"
                    style={{
                      transform: `translate(${dotPos.x}px, ${dotPos.y}px)`
                    }}
                  />
                )}
              </div>
            )}
            <div className="prose prose-lg max-w-none">
              {currentTest.type !== "dot" && paragraphData.map((para, pIdx) => (
                <p key={pIdx} className="text-xl lg:text-2xl leading-relaxed font-medium text-foreground/90 tracking-wide mb-8"
                  style={{ lineHeight: "2.2" }}>
                  {para.words.map((word, wIdx) => {
                    const index = para.startIndex + wIdx;
                    return (
                      <span key={wIdx}
                        className={cn(
                          "inline-block mr-2 px-1 py-0.5 rounded transition-all duration-100",
                          index === currentWord && "bg-primary/20 text-primary font-bold scale-102",
                          index < currentWord && "text-muted-foreground",
                          index > currentWord && status === "running" && "text-foreground/40"
                        )}
                      >
                        {word}
                      </span>
                    );
                  })}
                </p>
              ))}
            </div>
          </div>

          {/* Eye tracking visual indicator */}
          {webcamOn && (
            <div className="px-8 pb-6">
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-xl px-4 py-2.5">
                <Eye className="w-4 h-4" />
                <span className="font-medium">Tracking your reading focus (where your eyes pause)</span>
                <div className="ml-auto flex gap-1">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-1 bg-green-400 rounded-full animate-pulse-soft"
                      style={{
                        height: `${16 + i * 4}px`,
                        animationDelay: `${i * 200}ms`
                      }} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

          {/* RIGHT COLUMN: Camera Preview */}
          <div className="lg:col-span-3 sticky top-8 space-y-4">
             <p className="text-xs font-medium text-muted-foreground text-center">Eye Tracking</p>

             <div className="h-[420px]">
                <TrackingPreview videoRef={videoRef} status={trackingStatus} />
             </div>

             <div className="space-y-2">
                {trackingStatus.isBlinking && (
                   <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-xs font-medium text-amber-700">Blink detected</span>
                   </div>
                )}
                {trackingStatus.isOutOfFrame && (
                   <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                      <span className="text-xs font-medium text-red-700">Please stay in frame</span>
                   </div>
                )}
             </div>
          </div>
        </div>

        {/* Results / Next Step */}
        {status === "finished" && (
          <div className="bg-gradient-to-r from-green-50 to-accent/10 rounded-2xl border border-green-200/50 p-6 opacity-0 animate-bounce-in">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-foreground text-lg">Reading Complete!</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Great job! You finished in {formatTime(time)}. Ready for the writing test?
                </p>
                <div className="flex gap-3 mt-4">
                  <Link href="/writing-test">
                    <Button className="rounded-xl px-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25">
                      Continue to Writing Test <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
