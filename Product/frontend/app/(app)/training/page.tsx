"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { useElementInView } from "@/hooks/use-scroll-progress";
import { Button } from "@/components/ui/button";
import { BookOpen, PenTool, Music, Lock, CheckCircle, Play, ChevronRight, Star, Zap } from "lucide-react";
import Link from "next/link";

const weekProgress = 3; // current week
const totalWeeks = 8;

const exercises = [
  {
    id: 1,
    title: "Reading Flow Exercise",
    description: "Practice reading without backtracking. Follow the highlighted words smoothly.",
    icon: BookOpen,
    emoji: "📖",
    duration: "10 min",
    xp: 50,
    status: "completed" as const,
    color: "from-primary/10 to-orange-50",
  },
  {
    id: 2,
    title: "Letter Pattern Writing",
    description: "Write b, d, p, q patterns to build muscle memory and reduce letter reversal.",
    icon: PenTool,
    emoji: "✏️",
    duration: "8 min",
    xp: 40,
    status: "active" as const,
    color: "from-blue-50 to-primary/5",
  },
  {
    id: 3,
    title: "Rhythm & Timing",
    description: "Tap along to rhythmic patterns to improve your writing timing consistency.",
    icon: Music,
    emoji: "🎵",
    duration: "5 min",
    xp: 30,
    status: "locked" as const,
    color: "from-accent/10 to-yellow-50",
  },
  {
    id: 4,
    title: "Word Recognition Speed",
    description: "Flash cards to improve quick word recognition and reduce decoding time.",
    icon: Zap,
    emoji: "⚡",
    duration: "7 min",
    xp: 45,
    status: "locked" as const,
    color: "from-green-50 to-accent/5",
  },
];

const dailyProgress = 50; // 2 of 4 exercises done

export default function TrainingPage() {
  const ref = useRef<HTMLDivElement>(null);
  const { hasBeenInView } = useElementInView(ref, { threshold: 0.1 });
  const [activeExercise, setActiveExercise] = useState<number | null>(null);

  return (
    <div ref={ref} className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className={cn("opacity-0", hasBeenInView && "animate-fade-in-up")}>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3"
          style={{ fontFamily: "var(--font-fredoka)" }}>
          🎯 Training Program
        </h1>
        <p className="text-muted-foreground mt-1">
          Your personalized brain training exercises
        </p>
      </div>

      {/* Week Progress */}
      <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm opacity-0 animate-fade-in-up"
        style={{ animationDelay: "200ms" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-foreground text-lg">Week {weekProgress} of {totalWeeks}</h3>
            <p className="text-sm text-muted-foreground">Keep going, you&apos;re doing amazing! 💪</p>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400" />
            <span className="text-lg font-bold text-foreground">320 XP</span>
          </div>
        </div>

        {/* Week timeline */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalWeeks }).map((_, i) => (
            <div key={i} className="flex-1">
              <div className={cn(
                "h-2.5 rounded-full transition-all duration-500",
                i < weekProgress ? "bg-primary" :
                i === weekProgress ? "bg-primary/30 relative overflow-hidden" : "bg-secondary"
              )}>
                {i === weekProgress && (
                  <div className="absolute inset-0 animate-shimmer" />
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 text-center">W{i + 1}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Progress */}
      <div className="bg-gradient-to-r from-primary/5 to-accent/10 rounded-2xl border border-border/50 p-5 opacity-0 animate-fade-in-up"
        style={{ animationDelay: "400ms" }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">Today&apos;s Progress</h3>
          <span className="text-sm text-primary font-bold">{dailyProgress}%</span>
        </div>
        <div className="h-3 bg-white/50 rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-1000 relative"
            style={{ width: `${dailyProgress}%` }}>
            <div className="absolute inset-0 animate-shimmer" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Complete 2 more exercises to reach today&apos;s goal! 🎯
        </p>
      </div>

      {/* Exercises */}
      <div>
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2 opacity-0 animate-fade-in-up"
          style={{ animationDelay: "500ms" }}>
          📚 Today&apos;s Exercises
        </h3>
        <div className="space-y-3 stagger-children">
          {exercises.map((exercise) => (
            <div
              key={exercise.id}
              className={cn(
                "card-3d group bg-gradient-to-r rounded-2xl border border-border/50 p-5 shadow-sm cursor-pointer",
                exercise.color,
                exercise.status === "locked" && "opacity-60",
                activeExercise === exercise.id && "ring-2 ring-primary/30"
              )}
              onClick={() => exercise.status !== "locked" && setActiveExercise(
                activeExercise === exercise.id ? null : exercise.id
              )}
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110",
                  exercise.status === "completed" ? "bg-green-100" :
                  exercise.status === "active" ? "bg-primary/15" : "bg-secondary"
                )}>
                  {exercise.status === "completed" ? (
                    <CheckCircle className="w-7 h-7 text-green-500" />
                  ) : exercise.status === "locked" ? (
                    <Lock className="w-6 h-6 text-muted-foreground" />
                  ) : (
                    <span className="text-2xl">{exercise.emoji}</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-foreground">{exercise.title}</h4>
                    {exercise.status === "completed" && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Done ✓</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{exercise.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>⏱️ {exercise.duration}</span>
                    <span>⭐ {exercise.xp} XP</span>
                  </div>
                </div>

                {/* Action */}
                <div className="flex-shrink-0">
                  {exercise.status === "active" ? (
                    <Button size="sm" className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                      <Play className="w-4 h-4 mr-1" /> Start
                    </Button>
                  ) : exercise.status === "completed" ? (
                    <Button size="sm" variant="outline" className="rounded-xl">
                      Redo <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  ) : (
                    <Lock className="w-5 h-5 text-muted-foreground/40" />
                  )}
                </div>
              </div>

              {/* Expanded detail */}
              {activeExercise === exercise.id && exercise.status !== "locked" && (
                <div className="mt-4 pt-4 border-t border-border/30 text-sm text-muted-foreground animate-fade-in">
                  <p>{exercise.description}</p>
                  {exercise.status === "active" && (
                    <div className="mt-3">
                      <Link href={exercise.id === 1 ? "/reading-test" : "/writing-test"}>
                        <Button className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground">
                          Begin Exercise <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
