"use client";

import { cn } from "@/lib/utils";

interface IntroSceneProps {
  progress: number;
  isActive: boolean;
}

export function IntroScene({ progress, isActive }: IntroSceneProps) {
  return (
    <div className="h-full flex items-center justify-center px-6">
      <div className="container mx-auto max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Text Content */}
          <div
            className="space-y-8"
            style={{
              transform: `translateY(${(1 - progress) * 30}px)`,
              opacity: isActive ? 1 - progress * 0.5 : 0,
            }}
          >
            <div className="space-y-4">
              <div
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium",
                  isActive && "animate-fade-in-up"
                )}
              >
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Early Screening Matters
              </div>
              
              <h1
                className={cn(
                  "text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground leading-tight",
                  isActive && "animate-fade-in-up delay-100"
                )}
                style={{ fontFamily: "var(--font-fredoka)" }}
              >
                <span className="text-balance">Every child deserves to </span>
                <span className="text-primary">shine</span>
              </h1>
              
              <p
                className={cn(
                  "text-lg lg:text-xl text-muted-foreground max-w-xl leading-relaxed",
                  isActive && "animate-fade-in-up delay-200"
                )}
              >
                MENTIS provides early dyslexia screening through innovative technology, 
                helping children unlock their full learning potential.
              </p>
            </div>
          </div>

          {/* Illustration */}
          <div
            className="relative flex items-center justify-center"
            style={{
              transform: `scale(${0.9 + progress * 0.1}) translateX(${progress * 20}px)`,
              opacity: isActive ? 1 : 0,
            }}
          >
            {/* Main child illustration placeholder */}
            <div className="relative">
              {/* Background glow */}
              <div className="absolute inset-0 -m-8 bg-gradient-to-br from-primary/20 via-accent/10 to-transparent rounded-full blur-3xl" />
              
              {/* Decorative elements */}
              <div className="absolute -top-8 -right-8 w-20 h-20 bg-accent/30 rounded-2xl rotate-12 animate-float" />
              <div className="absolute -bottom-6 -left-6 w-16 h-16 bg-primary/20 rounded-full animate-float delay-300" />
              <div className="absolute top-1/2 -right-12 w-10 h-10 bg-secondary rounded-lg rotate-45 animate-pulse-soft" />
              
              {/* Child figure (stylized) */}
              <div className="relative w-64 h-80 lg:w-80 lg:h-96">
                {/* Body background */}
                <div className="absolute inset-0 bg-gradient-to-b from-secondary to-secondary/50 rounded-[3rem] shadow-xl">
                  {/* Face area */}
                  <div className="absolute top-8 left-1/2 -translate-x-1/2 w-32 h-32 lg:w-40 lg:h-40 bg-[#FFE4C4] rounded-full shadow-inner">
                    {/* Eyes */}
                    <div className="absolute top-12 left-8 lg:left-10 w-4 h-4 lg:w-5 lg:h-5 bg-foreground rounded-full">
                      <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-background rounded-full" />
                    </div>
                    <div className="absolute top-12 right-8 lg:right-10 w-4 h-4 lg:w-5 lg:h-5 bg-foreground rounded-full">
                      <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-background rounded-full" />
                    </div>
                    {/* Smile */}
                    <div className="absolute bottom-8 lg:bottom-10 left-1/2 -translate-x-1/2 w-12 h-6 border-b-4 border-primary rounded-b-full" />
                    {/* Hair */}
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-36 lg:w-44 h-20 bg-[#8B4513] rounded-t-full" />
                  </div>
                  
                  {/* Book in hands */}
                  <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-24 h-16 lg:w-28 lg:h-20 bg-primary rounded-lg shadow-lg transform -rotate-3">
                    <div className="absolute inset-2 bg-background/90 rounded flex items-center justify-center">
                      <div className="space-y-1">
                        <div className="w-12 h-1.5 bg-foreground/20 rounded" />
                        <div className="w-10 h-1.5 bg-foreground/20 rounded" />
                        <div className="w-14 h-1.5 bg-foreground/20 rounded" />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Stars decoration */}
                <svg className="absolute -top-12 -left-8 w-8 h-8 text-accent animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <svg className="absolute top-1/3 -right-10 w-6 h-6 text-primary animate-pulse delay-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
