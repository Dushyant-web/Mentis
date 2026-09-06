"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useElementInView } from "@/hooks/use-scroll-progress";
import { Button } from "@/components/ui/button";
import { BookOpen, PenTool, Music, Lock, CheckCircle, Play, ChevronRight, Star, Zap, ArrowRight, Eye, Activity, Loader2, Brain, Lightbulb, Target } from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";

export default function TrainingPage() {
  const ref = useRef<HTMLDivElement>(null);
  const { hasBeenInView } = useElementInView(ref, { threshold: 0.1 });
  const [activeExercise, setActiveExercise] = useState<number | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exerciseContent, setExerciseContent] = useState<Record<number, any>>({});
  const [contentLoading, setContentLoading] = useState<number | null>(null);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const json = await api.get("/training/plan");
        setData(json);
      } catch (err) {
        console.error("Failed to fetch training plan", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, []);

  // Fetch exercise content when expanded
    const fetchContent = async (taskId: number) => {
      if (exerciseContent[taskId]) return; // already loaded
      
      setContentLoading(taskId);
      try {
        const json = await api.get(`/training/exercise-content/${taskId}`);
        setExerciseContent(prev => ({ ...prev, [taskId]: json }));
      } catch (err) {
        console.error("Failed to fetch exercise content", err);
      } finally {
        setContentLoading(null);
      }
    };

  const handleExpand = (id: number, locked: boolean) => {
    if (locked) return;
    const newActive = activeExercise === id ? null : id;
    setActiveExercise(newActive);
    if (newActive !== null) {
      fetchContent(id);
    }
  };

  const dailyProgress = data?.today?.progress || 0;
  const exercises = data?.today?.exercises || [];
  const earnedXP = data?.today?.xp_earned || 0;
  const totalXP = data?.xp_today_total || 0;
  const weakness = data?.today?.weakness_profile || { reading: 0, writing: 0, rhythm: 0 };
  const totalWeeks = data?.today?.total_weeks || 8;
  // clamp so we never show "Week 14 of 8" once the plan is past its end
  const weekProgress = Math.min(Math.max(data?.today?.current_week || 1, 1), totalWeeks);
  const adaptiveLevel = data?.adaptive_level || null;
  const isCompletedWaiting = data?.today?.all_completed_waiting || false;

  if (loading) {
    return <div className="text-center py-10">Loading training...</div>;
  }

  const getExerciseIcon = (type: string, adaptive?: boolean) => {
    if (adaptive) return <Zap className="w-6 h-6 text-purple-500" />;
    if (type === "eye") return <Eye className="w-6 h-6 text-blue-500" />;
    if (type === "pen") return <PenTool className="w-6 h-6 text-orange-500" />;
    if (type === "rhythm") return <Music className="w-6 h-6 text-green-500" />;
    if (type === "combined") return <Brain className="w-6 h-6 text-violet-500" />;
    return <BookOpen className="w-6 h-6 text-foreground" />;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      reading: "bg-blue-50 text-blue-700 border-blue-200",
      writing: "bg-orange-50 text-orange-700 border-orange-200",
      rhythm: "bg-green-50 text-green-700 border-green-200",
      motor: "bg-green-50 text-green-700 border-green-200",
      cognitive: "bg-violet-50 text-violet-700 border-violet-200",
      adaptive: "bg-purple-50 text-purple-700 border-purple-200",
    };
    return colors[category] || "bg-secondary text-muted-foreground";
  };

  const markComplete = async (id: number) => {
    try {
      await api.post(`/training/complete/${id}`, {});
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
  };

  // Render preview of exercise content items
  const renderContentPreview = (content: any) => {
    if (!content?.content) return null;
    const c = content.content;
    const items = c.items || [];
    const tips = c.tips || [];

    return (
      <div className="space-y-4">
        {/* Instruction */}
        {c.instruction && (
          <div className="bg-primary/5 border border-primary/15 rounded-xl p-4">
            <p className="text-sm text-foreground leading-relaxed flex items-start gap-2">
              <Target className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              {c.instruction}
            </p>
          </div>
        )}

        {/* Preview Items */}
        {items.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Preview ({Math.min(items.length, 3)} of {items.length} items)
            </p>
            <div className="space-y-2">
              {items.slice(0, 3).map((item: any, i: number) => (
                <div key={i} className="bg-secondary/40 rounded-lg p-3 text-sm">
                  {/* Word-based exercises */}
                  {item.word && (
                    <span className="font-mono font-bold text-foreground text-lg">{item.word}</span>
                  )}
                  {/* Sentence-based */}
                  {item.sentence && (
                    <span className="text-foreground italic">&ldquo;{item.sentence}&rdquo;</span>
                  )}
                  {/* Passage-based */}
                  {item.text && !item.sentence && (
                    <span className="text-foreground line-clamp-2">{item.text}</span>
                  )}
                  {/* Pattern-based (sequence) */}
                  {item.sequence && (
                    <div className="flex items-center gap-2">
                      {(Array.isArray(item.sequence) ? item.sequence : [item.sequence]).map((s: string, j: number) => (
                        <span key={j} className={cn(
                          "px-2 py-1 rounded-md font-mono font-bold",
                          s === "?" ? "bg-primary/20 text-primary" : "bg-card border"
                        )}>{s}</span>
                      ))}
                    </div>
                  )}
                  {/* Letter pair exercises */}
                  {item.pair && !item.sequence && (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-mono font-bold text-foreground bg-card px-3 py-1 rounded-lg border">{item.letter_a || item.pair[0]}</span>
                      <span className="text-muted-foreground text-xs">vs</span>
                      <span className="text-2xl font-mono font-bold text-foreground bg-card px-3 py-1 rounded-lg border">{item.letter_b || item.pair[1]}</span>
                      {item.hint && <span className="text-xs text-muted-foreground ml-2 inline-flex items-center gap-1"><Lightbulb className="w-3 h-3" /> {item.hint}</span>}
                    </div>
                  )}
                  {/* Rhythm / timing */}
                  {item.bpm && (
                    <div className="flex items-center gap-3">
                      <Music className="w-5 h-5 text-primary" />
                      <span className="font-medium">{item.label}</span>
                      <span className="text-xs text-muted-foreground">({item.duration_seconds}s)</span>
                    </div>
                  )}
                  {/* Shape drawing */}
                  {item.guide && item.name && (
                    <div className="flex items-center gap-3">
                      <Star className="w-5 h-5 text-primary" />
                      <span className="font-medium">{item.name}</span>
                      <span className="text-xs text-muted-foreground">{item.instruction}</span>
                    </div>
                  )}
                  {/* Incomplete words */}
                  {item.incomplete && (
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-lg font-bold text-orange-600">{item.incomplete}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-mono text-lg font-bold text-green-600">{item.complete}</span>
                    </div>
                  )}
                  {/* MCQ / Options */}
                  {item.options && !item.sequence && !item.pair && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {item.options.map((opt: string, j: number) => (
                        <span key={j} className="px-2 py-1 bg-card border rounded-md text-xs font-medium">{opt}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {items.length > 3 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{items.length - 3} more items
                </p>
              )}
            </div>
          </div>
        )}

        {/* Tips */}
        {tips.length > 0 && (
          <div className="bg-amber-50/50 border border-amber-200/50 rounded-xl p-3">
            <p className="text-xs font-semibold text-amber-800 mb-1.5 flex items-center gap-1">
              <Lightbulb className="w-3.5 h-3.5" /> Tips
            </p>
            <ul className="space-y-1">
              {tips.map((tip: string, i: number) => (
                <li key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                  <span className="text-amber-400 mt-0.5">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={ref} className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className={cn("opacity-0", hasBeenInView && "animate-fade-in-up")}>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3"
          style={{ fontFamily: "var(--font-fredoka)" }}>
          <Target className="w-7 h-7 text-primary" />
          Training Program
        </h1>
        <p className="text-muted-foreground mt-1">
          Your personalized brain training exercises
        </p>
      </div>

      {/* Completion Waiting Banner */}
      {isCompletedWaiting && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5 shadow-sm opacity-0 animate-fade-in-up flex items-start md:items-center justify-between flex-col md:flex-row gap-4" style={{ animationDelay: "50ms" }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border border-green-200/50">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-green-900 text-lg">All Exercises Completed!</h3>
              <p className="text-green-700 text-sm mt-0.5">Amazing work. You've finished your personalized training batch.</p>
            </div>
          </div>
          <div className="bg-white/60 px-4 py-2 rounded-xl text-center border border-green-200 min-w-[200px] shadow-sm">
            <p className="text-[10px] font-bold text-green-600/80 uppercase tracking-wider mb-0.5">Next Adaptive Batch</p>
            <p className="font-semibold text-green-800 text-sm">Loads Tomorrow (in 24h)</p>
          </div>
        </div>
      )}

      {/* Level Banner */}
      {adaptiveLevel && (
        <div className="bg-gradient-to-r from-card to-card/50 rounded-2xl border border-border/50 p-5 shadow-sm opacity-0 animate-fade-in-up"
          style={{ animationDelay: "100ms", borderLeft: `4px solid ${adaptiveLevel.badge_color}` }}>
          <div className="flex items-start md:items-center justify-between flex-col md:flex-row gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h3 className="font-semibold text-foreground text-lg">Adaptive Skill Level</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white shadow-sm"
                  style={{ backgroundColor: adaptiveLevel.badge_color }}>
                  {adaptiveLevel.level_label}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {adaptiveLevel.description}
              </p>
            </div>
            
            <div className="flex items-center gap-4 bg-background/50 px-4 py-2 rounded-xl border border-border/50">
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Skill Rating</p>
                <p className="text-xl font-bold leading-none" style={{ color: adaptiveLevel.badge_color }}>
                  {adaptiveLevel.skill_score}<span className="text-sm text-muted-foreground ml-0.5">/100</span>
                </p>
              </div>
              <div className="w-px h-8 bg-border/50"></div>
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">XP Bonus</p>
                <p className="text-xl font-bold leading-none text-amber-500">
                  {adaptiveLevel.xp_multiplier}x
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex items-center gap-2">
            <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000" 
                style={{ width: `${adaptiveLevel.skill_score}%`, backgroundColor: adaptiveLevel.badge_color }} />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Week Progress */}
        <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm opacity-0 animate-fade-in-up"
          style={{ animationDelay: "200ms" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground text-lg">Week {weekProgress} of {totalWeeks}</h3>
              <p className="text-sm text-muted-foreground">Keep going, you&apos;re doing amazing!</p>
            </div>
            <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              <span className="text-lg font-bold text-amber-700">{earnedXP} <span className="text-sm font-medium">XP Today</span></span>
            </div>
          </div>

          {/* Week timeline */}
          <div className="flex items-center gap-1.5 mt-auto pt-2">
            {Array.from({ length: totalWeeks }).map((_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className={cn(
                  "h-2.5 w-full rounded-full transition-all duration-500",
                  i < weekProgress - 1 ? "bg-primary" :
                  i === weekProgress - 1 ? "bg-primary/30 relative overflow-hidden" : "bg-secondary"
                )}>
                  {i === weekProgress - 1 && (
                    <div className="absolute inset-0 animate-shimmer" />
                  )}
                </div>
                <p className={cn(
                  "text-[10px] font-medium",
                  i === weekProgress - 1 ? "text-primary" : "text-muted-foreground"
                )}>W{i + 1}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Brain Focus Profile */}
        <div className="bg-gradient-to-br from-card to-card/50 rounded-2xl border border-border/50 p-5 shadow-sm opacity-0 animate-fade-in-up"
          style={{ animationDelay: "300ms" }}>
          <h3 className="font-semibold text-foreground text-base mb-3 flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            Current AI Focus Areas
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-blue-700">Reading / Visual</span>
                <span className="text-blue-600/70">{Math.round(weakness.reading)}%</span>
              </div>
              <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${weakness.reading}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-orange-700">Writing / Motor</span>
                <span className="text-orange-600/70">{Math.round(weakness.writing)}%</span>
              </div>
              <div className="h-1.5 bg-orange-100 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full" style={{ width: `${weakness.writing}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-green-700">Timing / Rhythm</span>
                <span className="text-green-600/70">{Math.round(weakness.rhythm)}%</span>
              </div>
              <div className="h-1.5 bg-green-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${weakness.rhythm}%` }} />
              </div>
            </div>
          </div>
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
          {exercises.length} exercises today • {totalXP} XP goal
        </p>
      </div>

      {/* Exercises */}
      <div>
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2 opacity-0 animate-fade-in-up"
          style={{ animationDelay: "500ms" }}>
          <BookOpen className="w-5 h-5 text-primary" />
          Today&apos;s Exercises ({exercises.length})
        </h3>
        <div className="space-y-3 stagger-children">
          {exercises.map((exercise: any) => (
            <div
              key={exercise.id}
              className={cn(
                "card-3d group bg-card rounded-2xl border p-5 shadow-sm cursor-pointer transition-all duration-300",
                exercise.locked && "opacity-60 bg-secondary/30",
                exercise.adaptive && "border-purple-300/60 bg-purple-50/10",
                activeExercise === exercise.id && "ring-2 ring-primary/30 border-primary/50"
              )}
              onClick={() => handleExpand(exercise.id, exercise.locked)}
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110",
                  exercise.status === "done" ? "bg-green-100" :
                  exercise.adaptive ? "bg-purple-100 shadow-sm shadow-purple-200" :
                  !exercise.locked ? "bg-primary/10" : "bg-black/5"
                )}>
                  {exercise.status === "done" ? (
                    <CheckCircle className="w-7 h-7 text-green-600" />
                  ) : exercise.locked ? (
                    <Lock className="w-6 h-6 text-muted-foreground/50" />
                  ) : (
                    getExerciseIcon(exercise.type, exercise.adaptive)
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-foreground text-base tracking-tight">{exercise.name}</h4>
                    {exercise.adaptive && (
                      <span className="text-[10px] uppercase font-bold bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-2 py-0.5 rounded-full shadow-sm">
                        AI Adaptive
                      </span>
                    )}
                    {exercise.category && (
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", getCategoryColor(exercise.category))}>
                        {exercise.category}
                      </span>
                    )}
                    {exercise.status === "done" && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium border border-green-200 inline-flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Done</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                    {exerciseContent[exercise.id]?.content?.instruction 
                      || (exercise.adaptive ? "Personalized AI drill tailored to your weaknesses" : `${exercise.difficulty || "Standard"} ${exercise.category || exercise.type} exercise`)}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs font-medium text-muted-foreground">
                    <span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> {exercise.duration}</span>
                    <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-sm"><Star className="w-3.5 h-3.5" /> {exercise.xp} XP {exercise.difficulty === 'hard' && "(Boosted)"}</span>
                    {exercise.difficulty && (
                      <span className={cn(
                        "px-1.5 py-0.5 rounded-sm text-[10px] font-bold uppercase",
                        exercise.difficulty === "hard" ? "bg-red-50 text-red-600" :
                        exercise.difficulty === "adaptive" ? "bg-purple-50 text-purple-600" :
                        exercise.difficulty === "easy" ? "bg-green-50 text-green-600" :
                        "bg-blue-50 text-blue-600"
                      )}>{exercise.difficulty}</span>
                    )}
                  </div>
                </div>

                {/* Action */}
                <div className="flex-shrink-0">
                  {!exercise.locked && exercise.status !== "done" ? (
                    <ChevronRight className={cn(
                      "w-6 h-6 transition-all duration-300",
                      activeExercise === exercise.id ? "rotate-90 text-primary" : "text-muted-foreground"
                    )} />
                  ) : exercise.status === "done" ? (
                    <Button size="sm" variant="outline" className="rounded-xl border-green-200 text-green-700 hover:bg-green-50"
                      onClick={(e) => { e.stopPropagation(); markComplete(exercise.id); }}>
                      Redo <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  ) : (
                    <Lock className="w-5 h-5 text-muted-foreground/30" />
                  )}
                </div>
              </div>

              {/* Expanded detail with real content */}
              {activeExercise === exercise.id && !exercise.locked && (
                <div className="mt-4 pt-4 border-t border-border/30 text-sm animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                  {contentLoading === exercise.id ? (
                    <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading exercise content...
                    </div>
                  ) : exerciseContent[exercise.id] ? (
                    <>
                      {renderContentPreview(exerciseContent[exercise.id])}
                      
                      <div className="flex items-center gap-3 mt-4">
                        <Link href={`/training/exercise/${exercise.id}`}>
                          <Button className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all">
                            <Play className="w-4 h-4 mr-2" /> Start Exercise
                          </Button>
                        </Link>
                        <Button variant="secondary" className="rounded-xl font-medium"
                          onClick={() => markComplete(exercise.id)}>
                          <CheckCircle className="w-4 h-4 mr-2" /> Skip & Mark Done
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground py-4">
                      This drill focuses on improving your {exercise.category || exercise.type} skills.
                    </p>
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
