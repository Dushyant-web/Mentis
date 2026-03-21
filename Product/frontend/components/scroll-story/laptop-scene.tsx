"use client";

import { cn } from "@/lib/utils";

interface LaptopSceneProps {
  progress: number;
  isActive: boolean;
}

export function LaptopScene({ progress, isActive }: LaptopSceneProps) {
  const screenBrightness = isActive ? 0.3 + progress * 0.7 : 0;
  
  return (
    <div className="h-full flex items-center justify-center px-6">
      <div className="container mx-auto max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Text Content */}
          <div
            className="space-y-6"
            style={{
              transform: `translateY(${(1 - progress) * 30}px)`,
              opacity: isActive ? 1 : 0,
            }}
          >
            <div
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium",
                isActive && "animate-fade-in-up"
              )}
            >
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Eye-Tracking Technology
            </div>
            
            <h2
              className={cn(
                "text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight",
                isActive && "animate-fade-in-up delay-100"
              )}
              style={{ fontFamily: "var(--font-fredoka)" }}
            >
              Watch how they <span className="text-primary">read</span>
            </h2>
            
            <p
              className={cn(
                "text-lg text-muted-foreground max-w-xl leading-relaxed",
                isActive && "animate-fade-in-up delay-200"
              )}
            >
              Our advanced eye-tracking software analyzes reading patterns to identify 
              early signs of dyslexia. Just a simple reading exercise reveals valuable insights.
            </p>
            
            <div className={cn("space-y-3", isActive && "animate-fade-in-up delay-300")}>
              {[
                "Non-invasive assessment",
                "Real-time analysis",
                "Age-appropriate content"
              ].map((item, index) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Laptop Illustration */}
          <div
            className="relative flex items-center justify-center"
            style={{
              transform: `translateX(${(1 - progress) * 40}px) rotateY(${(1 - progress) * -10}deg)`,
              opacity: isActive ? 1 : 0,
              perspective: "1000px",
            }}
          >
            <div className="relative">
              {/* Laptop glow */}
              <div 
                className="absolute inset-0 -m-12 bg-primary/10 rounded-full blur-3xl transition-opacity duration-1000"
                style={{ opacity: screenBrightness * 0.5 }}
              />
              
              {/* Laptop screen */}
              <div 
                className="relative bg-foreground rounded-t-xl p-2 shadow-2xl"
                style={{
                  transform: `rotateX(${5 - progress * 5}deg)`,
                  transformOrigin: "bottom center",
                }}
              >
                {/* Screen bezel */}
                <div className="w-72 h-44 lg:w-96 lg:h-56 bg-background rounded-lg overflow-hidden relative">
                  {/* Screen content */}
                  <div 
                    className="absolute inset-0 bg-gradient-to-br from-secondary via-background to-accent/20 p-4"
                    style={{ opacity: screenBrightness }}
                  >
                    {/* MENTIS interface mockup */}
                    <div className="h-full flex flex-col">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-primary rounded-lg flex items-center justify-center">
                            <span className="text-xs text-primary-foreground font-bold">M</span>
                          </div>
                          <span className="text-xs font-medium text-foreground">MENTIS</span>
                        </div>
                        <div className="flex gap-1">
                          <div className="w-2 h-2 rounded-full bg-green-400" />
                          <div className="w-2 h-2 rounded-full bg-accent" />
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        </div>
                      </div>
                      
                      {/* Reading content area */}
                      <div className="flex-1 bg-card rounded-lg p-3 shadow-inner">
                        {/* Text lines */}
                        <div className="space-y-2">
                          <div className="h-2 bg-foreground/20 rounded w-full" />
                          <div className="h-2 bg-foreground/20 rounded w-4/5" />
                          <div className="h-2 bg-foreground/20 rounded w-full" />
                          <div className="h-2 bg-foreground/20 rounded w-3/4" />
                        </div>
                        
                        {/* Eye tracking visualization */}
                        <div className="mt-4 relative">
                          <div 
                            className="absolute w-3 h-3 bg-primary rounded-full animate-pulse"
                            style={{
                              left: `${20 + progress * 60}%`,
                              top: "0",
                              boxShadow: "0 0 12px 4px rgba(249, 115, 22, 0.4)"
                            }}
                          />
                          {/* Trail dots */}
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className="absolute w-1.5 h-1.5 bg-primary/40 rounded-full"
                              style={{
                                left: `${10 + i * 12}%`,
                                top: "2px",
                                opacity: i < Math.floor(progress * 5) ? 1 : 0.2,
                              }}
                            />
                          ))}
                        </div>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all duration-1000"
                          style={{ width: `${progress * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Webcam dot */}
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-foreground/50">
                    <div 
                      className="absolute inset-0.5 rounded-full bg-green-400 animate-pulse"
                      style={{ opacity: screenBrightness }}
                    />
                  </div>
                </div>
              </div>
              
              {/* Laptop base */}
              <div className="relative">
                <div className="w-80 h-3 lg:w-[26rem] lg:h-4 bg-foreground/90 rounded-b-xl mx-auto" />
                <div className="w-24 h-1 bg-foreground/60 rounded-full mx-auto -mt-0.5" />
              </div>
              
              {/* Shadow */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-72 lg:w-96 h-4 bg-foreground/10 rounded-full blur-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
