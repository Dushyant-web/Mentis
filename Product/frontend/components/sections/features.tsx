"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import { useElementInView } from "@/hooks/use-scroll-progress";

const features = [
  {
    title: "Eye Tracking Analysis",
    description: "Advanced camera technology tracks eye movements during reading to identify patterns associated with dyslexia.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    gradient: "from-primary/20 to-accent/20",
  },
  {
    title: "Smart Pen Technology",
    description: "Our specialized pen captures handwriting dynamics including pressure, speed, and stroke patterns in real-time.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    ),
    gradient: "from-accent/20 to-yellow-200/30",
  },
  {
    title: "AI-Powered Insights",
    description: "Machine learning algorithms analyze collected data to provide accurate screening results and personalized recommendations.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    gradient: "from-blue-200/30 to-primary/20",
  },
  {
    title: "Progress Tracking",
    description: "Monitor improvement over time with detailed progress reports and milestone tracking for each child.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    gradient: "from-green-200/30 to-accent/20",
  },
  {
    title: "Child-Friendly Design",
    description: "Engaging, game-like activities make screening feel like play, keeping children motivated and comfortable.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    gradient: "from-pink-200/30 to-primary/20",
  },
  {
    title: "Expert Reports",
    description: "Comprehensive reports designed for parents, educators, and specialists to understand and act on results.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    gradient: "from-primary/20 to-blue-200/30",
  },
];

export function Features() {
  const sectionRef = useRef<HTMLElement>(null);
  const { hasBeenInView } = useElementInView(sectionRef, { threshold: 0.15 });

  return (
    <section
      ref={sectionRef}
      id="features"
      className="py-24 lg:py-32 bg-background"
    >
      <div className="container mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/30 text-foreground text-sm font-medium mb-6 opacity-0",
              hasBeenInView && "animate-fade-in-up"
            )}
          >
            Powerful Features
          </div>
          
          <h2
            className={cn(
              "text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6 opacity-0",
              hasBeenInView && "animate-fade-in-up delay-100"
            )}
            style={{ fontFamily: "var(--font-fredoka)" }}
          >
            Everything you need for <span className="text-primary">early screening</span>
          </h2>
          
          <p
            className={cn(
              "text-lg text-muted-foreground opacity-0",
              hasBeenInView && "animate-fade-in-up delay-200"
            )}
          >
            MENTIS combines cutting-edge technology with research-backed methods to provide 
            the most accurate early dyslexia screening available.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={cn(
                "group relative p-6 lg:p-8 rounded-3xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl opacity-0",
                hasBeenInView && "animate-fade-in-up"
              )}
              style={{ animationDelay: `${300 + index * 100}ms` }}
            >
              {/* Background gradient */}
              <div
                className={cn(
                  "absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br",
                  feature.gradient
                )}
              />
              
              <div className="relative">
                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform duration-500">
                  {feature.icon}
                </div>
                
                {/* Content */}
                <h3 className="text-xl font-bold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
