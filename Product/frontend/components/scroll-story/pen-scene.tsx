"use client";

import { cn } from "@/lib/utils";

interface PenSceneProps {
  progress: number;
  isActive: boolean;
}

export function PenScene({ progress, isActive }: PenSceneProps) {
  return (
    <div className="h-full flex items-center justify-center px-6">
      <div className="container mx-auto max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Smart Pen Illustration */}
          <div
            className="relative flex items-center justify-center order-2 lg:order-1"
            style={{
              transform: `translateX(${(1 - progress) * -40}px)`,
              opacity: isActive ? 1 : 0,
            }}
          >
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute inset-0 -m-16 bg-gradient-to-br from-primary/20 via-accent/10 to-transparent rounded-full blur-3xl" />
              
              {/* Writing surface (paper) */}
              <div className="relative w-72 h-80 lg:w-80 lg:h-96 bg-background rounded-2xl shadow-2xl overflow-hidden">
                {/* Paper texture */}
                <div className="absolute inset-0 opacity-30" style={{ 
                  backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 31px, #e5e5e5 31px, #e5e5e5 32px)`,
                  backgroundSize: '100% 32px'
                }} />
                
                {/* Red margin line */}
                <div className="absolute top-0 bottom-0 left-12 w-px bg-red-300/50" />
                
                {/* Handwritten text simulation */}
                <div className="absolute top-12 left-16 right-8 space-y-6">
                  {/* Simulated handwriting lines */}
                  <svg viewBox="0 0 200 20" className="w-full h-6 text-foreground/70">
                    <path 
                      d="M0,15 Q20,5 40,15 T80,15 T120,15 T160,15 T200,15" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeDasharray="200"
                      strokeDashoffset={200 - progress * 200}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <svg viewBox="0 0 180 20" className="w-11/12 h-6 text-foreground/70">
                    <path 
                      d="M0,10 Q15,18 30,10 T60,10 T90,10 T120,10 T150,10 T180,10" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeDasharray="180"
                      strokeDashoffset={180 - progress * 180}
                      className="transition-all duration-1000 delay-200"
                    />
                  </svg>
                  <svg viewBox="0 0 160 20" className="w-10/12 h-6 text-foreground/70">
                    <path 
                      d="M0,12 Q12,5 24,12 T48,12 T72,12 T96,12 T120,12 T144,12 T160,12" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeDasharray="160"
                      strokeDashoffset={160 - progress * 160}
                      className="transition-all duration-1000 delay-400"
                    />
                  </svg>
                </div>
                
                {/* MENTIS Smart Pen */}
                <div 
                  className="absolute transition-all duration-700"
                  style={{
                    bottom: `${20 + progress * 30}%`,
                    right: `${10 + progress * 20}%`,
                    transform: `rotate(${-45 + progress * 15}deg)`,
                  }}
                >
                  {/* Pen body */}
                  <div className="relative">
                    {/* Main pen body */}
                    <div className="w-8 h-40 lg:w-10 lg:h-48 bg-gradient-to-b from-primary via-primary to-primary/90 rounded-t-xl rounded-b-sm shadow-xl">
                      {/* Grip section */}
                      <div className="absolute bottom-8 left-0 right-0 h-16 bg-foreground/20 rounded" />
                      
                      {/* MENTIS logo on pen */}
                      <div className="absolute top-6 left-1/2 -translate-x-1/2 w-6 h-6 bg-background/20 rounded-full flex items-center justify-center">
                        <span className="text-[8px] font-bold text-primary-foreground">M</span>
                      </div>
                      
                      {/* LED indicator */}
                      <div 
                        className="absolute top-16 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full transition-all duration-500"
                        style={{
                          backgroundColor: isActive ? '#22c55e' : '#64748b',
                          boxShadow: isActive ? '0 0 8px 2px rgba(34, 197, 94, 0.5)' : 'none',
                        }}
                      />
                      
                      {/* Sensor window */}
                      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-4 h-6 bg-foreground/30 rounded-sm" />
                    </div>
                    
                    {/* Pen tip */}
                    <div className="w-2 h-4 bg-foreground/80 mx-auto rounded-b-full" />
                    
                    {/* Writing glow effect */}
                    <div 
                      className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-primary rounded-full blur-md transition-opacity duration-300"
                      style={{ opacity: isActive ? 0.6 : 0 }}
                    />
                  </div>
                </div>
                
                {/* Data visualization overlay */}
                <div 
                  className="absolute bottom-4 left-4 right-4 h-16 bg-card/80 backdrop-blur-sm rounded-xl p-3 transition-all duration-500"
                  style={{ 
                    opacity: progress > 0.5 ? 1 : 0,
                    transform: `translateY(${progress > 0.5 ? 0 : 20}px)`,
                  }}
                >
                  <div className="flex items-center justify-between h-full">
                    <div className="space-y-1">
                      <div className="text-[10px] text-muted-foreground">Pressure Analysis</div>
                      <div className="flex gap-0.5">
                        {[...Array(10)].map((_, i) => (
                          <div 
                            key={i}
                            className="w-1.5 rounded-full bg-primary transition-all duration-300"
                            style={{ 
                              height: `${8 + Math.sin(i + progress * 5) * 8}px`,
                              opacity: 0.4 + (i / 10) * 0.6,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-muted-foreground">Speed</div>
                      <div className="text-sm font-bold text-primary">{Math.round(progress * 100)}%</div>
                    </div>
                  </div>
                </div>
              </div>
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
              Smart Pen Technology
            </div>
            
            <h2
              className={cn(
                "text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight",
                isActive && "animate-fade-in-up delay-100"
              )}
              style={{ fontFamily: "var(--font-fredoka)" }}
            >
              Every stroke tells a <span className="text-primary">story</span>
            </h2>
            
            <p
              className={cn(
                "text-lg text-muted-foreground max-w-xl leading-relaxed",
                isActive && "animate-fade-in-up delay-200"
              )}
            >
              The MENTIS smart pen captures handwriting patterns, pressure, speed, and 
              stroke formation to provide comprehensive insights into learning patterns.
            </p>
            
            <div className={cn("grid grid-cols-2 gap-4", isActive && "animate-fade-in-up delay-300")}>
              {[
                { label: "Pressure", value: "Sensitivity" },
                { label: "Speed", value: "Tracking" },
                { label: "Formation", value: "Analysis" },
                { label: "Patterns", value: "Detection" },
              ].map((item) => (
                <div key={item.label} className="p-4 bg-card rounded-xl shadow-sm border border-border/50">
                  <div className="text-sm text-muted-foreground">{item.label}</div>
                  <div className="text-lg font-semibold text-foreground">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
