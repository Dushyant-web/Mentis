"use client";

import { cn } from "@/lib/utils";

interface AssessmentSceneProps {
  progress: number;
  isActive: boolean;
}

export function AssessmentScene({ progress, isActive }: AssessmentSceneProps) {
  const metrics = [
    { label: "Reading Fluency", value: 85, color: "bg-primary" },
    { label: "Pattern Recognition", value: 72, color: "bg-accent" },
    { label: "Letter Formation", value: 90, color: "bg-green-400" },
    { label: "Writing Speed", value: 78, color: "bg-blue-400" },
  ];

  return (
    <div className="h-full flex items-center justify-center px-6">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <div
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6",
              isActive && "animate-fade-in-up"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Comprehensive Results
          </div>
          
          <h2
            className={cn(
              "text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-4",
              isActive && "animate-fade-in-up delay-100"
            )}
            style={{ fontFamily: "var(--font-fredoka)" }}
          >
            Clear <span className="text-primary">insights</span> for better support
          </h2>
          
          <p
            className={cn(
              "text-lg text-muted-foreground max-w-2xl mx-auto",
              isActive && "animate-fade-in-up delay-200"
            )}
          >
            Detailed assessment reports help parents and educators understand 
            each child&apos;s unique learning profile.
          </p>
        </div>

        {/* Assessment Dashboard */}
        <div
          className="max-w-4xl mx-auto"
          style={{
            transform: `translateY(${(1 - progress) * 40}px)`,
            opacity: isActive ? 1 : 0,
          }}
        >
          <div className="bg-card rounded-3xl shadow-2xl p-6 lg:p-8 border border-border/50">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center">
                  <span className="text-2xl">&#x1F4D6;</span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Assessment Report</h3>
                  <p className="text-sm text-muted-foreground">Complete screening analysis</p>
                </div>
              </div>
              <div className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                Completed
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {metrics.map((metric, index) => (
                <div 
                  key={metric.label}
                  className={cn(
                    "p-4 bg-background rounded-2xl border border-border/30",
                    isActive && "animate-fade-in-up"
                  )}
                  style={{ animationDelay: `${300 + index * 100}ms` }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">{metric.label}</span>
                    <span className="font-semibold text-foreground">{metric.value}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all duration-1000", metric.color)}
                      style={{ 
                        width: isActive ? `${metric.value * progress}%` : '0%',
                        transitionDelay: `${index * 150}ms`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Section */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-primary/5 rounded-2xl text-center">
                <div className="text-3xl font-bold text-primary mb-1">A+</div>
                <div className="text-sm text-muted-foreground">Overall Score</div>
              </div>
              <div className="p-4 bg-accent/10 rounded-2xl text-center">
                <div className="text-3xl font-bold text-foreground mb-1">15</div>
                <div className="text-sm text-muted-foreground">Tasks Completed</div>
              </div>
              <div className="p-4 bg-green-50 rounded-2xl text-center">
                <div className="text-3xl font-bold text-green-600 mb-1">Low</div>
                <div className="text-sm text-muted-foreground">Risk Indicator</div>
              </div>
            </div>

            {/* Action Items */}
            <div className="mt-8 pt-6 border-t border-border/50">
              <h4 className="font-semibold text-foreground mb-4">Recommended Next Steps</h4>
              <div className="space-y-3">
                {[
                  "Schedule follow-up assessment in 3 months",
                  "Practice phonemic awareness exercises",
                  "Continue reading together daily"
                ].map((item, index) => (
                  <div 
                    key={item}
                    className={cn(
                      "flex items-center gap-3 p-3 bg-background rounded-xl",
                      isActive && "animate-fade-in-up"
                    )}
                    style={{ animationDelay: `${600 + index * 100}ms` }}
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary">{index + 1}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
