"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import { useElementInView } from "@/hooks/use-scroll-progress";

const stats = [
  { value: "15%", label: "of children affected by dyslexia" },
  { value: "85%", label: "accuracy in early detection" },
  { value: "50+", label: "research papers referenced" },
  { value: "10k+", label: "children screened" },
];

const researchPoints = [
  {
    title: "Backed by Science",
    description: "MENTIS is built on decades of research in cognitive science, education, and machine learning.",
  },
  {
    title: "Continuous Improvement",
    description: "Our algorithms are constantly refined based on new research and real-world screening data.",
  },
  {
    title: "Expert Collaboration",
    description: "Developed in partnership with leading dyslexia researchers and educational psychologists.",
  },
];

export function Research() {
  const sectionRef = useRef<HTMLElement>(null);
  const { hasBeenInView } = useElementInView(sectionRef, { threshold: 0.2 });

  return (
    <section
      ref={sectionRef}
      id="research"
      className="py-24 lg:py-32 bg-gradient-to-b from-secondary/30 via-background to-background relative overflow-hidden"
    >
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-accent/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />

      <div className="container mx-auto px-6 lg:px-12 relative">
        {/* Stats */}
        <div
          className={cn(
            "grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mb-24 opacity-0",
            hasBeenInView && "animate-fade-in-up"
          )}
        >
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={cn(
                "text-center p-6 rounded-3xl bg-card/50 backdrop-blur-sm border border-border/50 opacity-0",
                hasBeenInView && "animate-fade-in-up"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div
                className="text-4xl lg:text-5xl font-bold text-primary mb-2"
                style={{ fontFamily: "var(--font-fredoka)" }}
              >
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Research Section */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Content */}
          <div>
            <div
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 opacity-0",
                hasBeenInView && "animate-fade-in-up delay-200"
              )}
            >
              Research-Backed
            </div>

            <h2
              className={cn(
                "text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6 opacity-0",
                hasBeenInView && "animate-fade-in-up delay-300"
              )}
              style={{ fontFamily: "var(--font-fredoka)" }}
            >
              Built on <span className="text-primary">proven</span> research
            </h2>

            <p
              className={cn(
                "text-lg text-muted-foreground mb-8 opacity-0",
                hasBeenInView && "animate-fade-in-up delay-400"
              )}
            >
              MENTIS combines the latest findings in cognitive science with advanced 
              technology to deliver accurate, reliable early dyslexia screening.
            </p>

            <div className="space-y-6">
              {researchPoints.map((point, index) => (
                <div
                  key={point.title}
                  className={cn(
                    "flex gap-4 opacity-0",
                    hasBeenInView && "animate-fade-in-up"
                  )}
                  style={{ animationDelay: `${500 + index * 100}ms` }}
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{point.title}</h3>
                    <p className="text-muted-foreground">{point.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual */}
          <div
            className={cn(
              "relative opacity-0",
              hasBeenInView && "animate-fade-in-up delay-300"
            )}
          >
            <div className="relative bg-card rounded-3xl p-8 shadow-xl border border-border/50">
              {/* Brain visualization */}
              <div className="aspect-square relative">
                {/* Central brain icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <svg className="w-16 h-16 lg:w-20 lg:h-20 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                </div>

                {/* Orbiting elements */}
                {[
                  { icon: "A", label: "Phonics", angle: 0 },
                  { icon: "R", label: "Reading", angle: 90 },
                  { icon: "W", label: "Writing", angle: 180 },
                  { icon: "M", label: "Memory", angle: 270 },
                ].map((item, index) => (
                  <div
                    key={item.label}
                    className="absolute w-16 h-16 rounded-2xl bg-card border border-border shadow-lg flex flex-col items-center justify-center animate-pulse-soft"
                    style={{
                      top: `${50 + 35 * Math.sin((item.angle * Math.PI) / 180)}%`,
                      left: `${50 + 35 * Math.cos((item.angle * Math.PI) / 180)}%`,
                      transform: "translate(-50%, -50%)",
                      animationDelay: `${index * 200}ms`,
                    }}
                  >
                    <span className="text-lg font-bold text-primary">{item.icon}</span>
                    <span className="text-[10px] text-muted-foreground">{item.label}</span>
                  </div>
                ))}

                {/* Connection lines */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200">
                  <circle
                    cx="100"
                    cy="100"
                    r="70"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    className="text-border"
                  />
                </svg>
              </div>
            </div>

            {/* Floating badges */}
            <div className="absolute -top-4 -right-4 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium shadow-lg">
              Validated
            </div>
            <div className="absolute -bottom-4 -left-4 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium shadow-lg">
              Peer Reviewed
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
