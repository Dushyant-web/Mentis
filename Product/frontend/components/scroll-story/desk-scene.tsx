"use client";

import { cn } from "@/lib/utils";

interface DeskSceneProps {
  progress: number;
  isActive: boolean;
}

export function DeskScene({ progress, isActive }: DeskSceneProps) {
  return (
    <div className="h-full flex items-center justify-center px-6">
      <div className="container mx-auto max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Illustration - Desk Scene */}
          <div
            className="relative flex items-center justify-center order-2 lg:order-1"
            style={{
              transform: `translateX(${(1 - progress) * -40}px)`,
              opacity: isActive ? 1 : 0,
            }}
          >
            <div className="relative w-full max-w-md">
              {/* Background elements */}
              <div className="absolute -inset-8 bg-gradient-to-br from-accent/20 via-transparent to-primary/10 rounded-3xl blur-2xl" />
              
              {/* Window/Wall background */}
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-32 bg-sky-100 rounded-t-2xl border-4 border-secondary overflow-hidden">
                {/* Window panes */}
                <div className="absolute inset-2 grid grid-cols-2 gap-1">
                  <div className="bg-sky-200/50 rounded" />
                  <div className="bg-sky-200/50 rounded" />
                </div>
                {/* Sun */}
                <div className="absolute top-4 right-4 w-8 h-8 bg-accent rounded-full animate-pulse-soft" />
              </div>
              
              {/* Desk */}
              <div className="relative bg-[#DEB887] rounded-xl p-6 shadow-xl">
                {/* Desk surface texture */}
                <div className="absolute inset-0 opacity-20 rounded-xl" style={{ background: 'repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(0,0,0,0.03) 20px, rgba(0,0,0,0.03) 21px)' }} />
                
                {/* Items on desk */}
                <div className="relative flex items-end justify-between gap-4 h-40">
                  {/* Stack of books */}
                  <div className="flex flex-col gap-1">
                    <div className="w-16 h-4 bg-primary rounded-sm shadow" />
                    <div className="w-14 h-4 bg-accent rounded-sm shadow" />
                    <div className="w-15 h-4 bg-secondary rounded-sm shadow" />
                  </div>
                  
                  {/* Chair back hint */}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-32 h-16 bg-primary/80 rounded-t-2xl shadow-inner" />
                  
                  {/* Pencil holder */}
                  <div className="relative">
                    <div className="w-10 h-16 bg-secondary rounded-b-lg rounded-t-sm shadow">
                      {/* Pencils */}
                      <div className="absolute -top-8 left-1 w-2 h-12 bg-yellow-400 rounded-t-full transform -rotate-6" />
                      <div className="absolute -top-10 left-3 w-2 h-14 bg-primary rounded-t-full transform rotate-3" />
                      <div className="absolute -top-6 right-2 w-2 h-10 bg-green-400 rounded-t-full transform rotate-6" />
                    </div>
                  </div>
                  
                  {/* Lamp */}
                  <div className="relative">
                    <div className="w-3 h-16 bg-foreground/80 rounded-full" />
                    <div className="absolute -top-2 -left-4 w-12 h-8 bg-accent rounded-b-full shadow-lg" />
                    {/* Light glow */}
                    <div 
                      className="absolute -top-4 -left-8 w-20 h-12 bg-accent/20 rounded-full blur-xl transition-opacity duration-500"
                      style={{ opacity: isActive ? 0.8 : 0 }}
                    />
                  </div>
                </div>
                
                {/* Desk legs */}
                <div className="absolute -bottom-8 left-4 w-4 h-8 bg-[#C4A574] rounded-b" />
                <div className="absolute -bottom-8 right-4 w-4 h-8 bg-[#C4A574] rounded-b" />
              </div>
              
              {/* Floor */}
              <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-80 h-4 bg-foreground/5 rounded-full blur-sm" />
            </div>
          </div>

          {/* Text Content */}
          <div
            className="space-y-6 order-1 lg:order-2"
            style={{
              transform: `translateY(${(1 - progress) * 30}px)`,
              opacity: isActive ? 1 : 0,
            }}
          >
            <div
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/30 text-foreground text-sm font-medium",
                isActive && "animate-fade-in-up"
              )}
            >
              <span className="w-2 h-2 rounded-full bg-accent" />
              A Familiar Setting
            </div>
            
            <h2
              className={cn(
                "text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight",
                isActive && "animate-fade-in-up delay-100"
              )}
              style={{ fontFamily: "var(--font-fredoka)" }}
            >
              Learning happens <span className="text-primary">anywhere</span>
            </h2>
            
            <p
              className={cn(
                "text-lg text-muted-foreground max-w-xl leading-relaxed",
                isActive && "animate-fade-in-up delay-200"
              )}
            >
              Whether at home or in school, MENTIS meets children where they are. 
              Our screening tools work seamlessly in any learning environment.
            </p>
            
            <div className={cn("flex flex-wrap gap-4", isActive && "animate-fade-in-up delay-300")}>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                Home-friendly
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-accent-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                School-ready
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
