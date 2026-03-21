"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import { useElementInView } from "@/hooks/use-scroll-progress";

const steps = [
  {
    number: "01",
    title: "Quick Setup",
    description: "Create an account and set up your child's profile in under 5 minutes. No technical knowledge required.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    ),
    color: "bg-primary",
  },
  {
    number: "02",
    title: "Fun Activities",
    description: "Children complete engaging, game-like activities designed to feel like play while gathering valuable data.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: "bg-accent",
  },
  {
    number: "03",
    title: "AI Analysis",
    description: "Our advanced algorithms analyze eye tracking and handwriting patterns to identify early indicators.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    color: "bg-blue-400",
  },
  {
    number: "04",
    title: "Clear Results",
    description: "Receive a comprehensive report with actionable insights and personalized recommendations.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: "bg-green-400",
  },
];

export function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const { hasBeenInView } = useElementInView(sectionRef, { threshold: 0.2 });

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="py-24 lg:py-32 bg-gradient-to-b from-background via-secondary/20 to-background overflow-hidden"
    >
      <div className="container mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 lg:mb-24">
          <div
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 opacity-0",
              hasBeenInView && "animate-fade-in-up"
            )}
          >
            Simple Process
          </div>
          
          <h2
            className={cn(
              "text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6 opacity-0",
              hasBeenInView && "animate-fade-in-up delay-100"
            )}
            style={{ fontFamily: "var(--font-fredoka)" }}
          >
            How <span className="text-primary">MENTIS</span> Works
          </h2>
          
          <p
            className={cn(
              "text-lg text-muted-foreground opacity-0",
              hasBeenInView && "animate-fade-in-up delay-200"
            )}
          >
            Four simple steps to understand your child&apos;s unique learning profile
          </p>
        </div>

        {/* Steps */}
        <div className="relative max-w-5xl mx-auto">
          {/* Connection line */}
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-border hidden lg:block" />
          
          <div className="space-y-12 lg:space-y-0">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className={cn(
                  "relative opacity-0",
                  hasBeenInView && "animate-fade-in-up",
                  index % 2 === 0 ? "lg:text-right" : "lg:text-left"
                )}
                style={{ animationDelay: `${300 + index * 150}ms` }}
              >
                <div
                  className={cn(
                    "lg:grid lg:grid-cols-2 lg:gap-12 items-center",
                    index % 2 === 0 ? "" : "lg:flex-row-reverse"
                  )}
                >
                  {/* Content */}
                  <div
                    className={cn(
                      "mb-6 lg:mb-0 lg:py-12",
                      index % 2 === 0 ? "lg:pr-12" : "lg:pl-12 lg:col-start-2"
                    )}
                  >
                    <div
                      className={cn(
                        "inline-flex items-center gap-3 mb-4",
                        index % 2 === 0 ? "lg:flex-row-reverse" : ""
                      )}
                    >
                      <span className="text-5xl font-bold text-muted-foreground/20">
                        {step.number}
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-foreground mb-3">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground max-w-md mx-auto lg:mx-0">
                      {step.description}
                    </p>
                  </div>

                  {/* Icon Card */}
                  <div
                    className={cn(
                      "flex lg:py-12",
                      index % 2 === 0 ? "lg:justify-start lg:col-start-2 lg:row-start-1" : "lg:justify-end lg:col-start-1 lg:row-start-1"
                    )}
                  >
                    <div className="relative">
                      {/* Connection dot */}
                      <div
                        className={cn(
                          "hidden lg:block absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-background border-4 border-primary z-10",
                          index % 2 === 0 ? "-left-14" : "-right-14"
                        )}
                      />
                      
                      <div
                        className={cn(
                          "w-24 h-24 rounded-3xl flex items-center justify-center text-background shadow-xl",
                          step.color
                        )}
                      >
                        {step.icon}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
