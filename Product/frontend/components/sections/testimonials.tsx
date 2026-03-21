"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import { useElementInView } from "@/hooks/use-scroll-progress";

const testimonials = [
  {
    quote: "MENTIS helped us understand why our daughter was struggling with reading. The early screening gave us the tools to support her effectively.",
    author: "Sarah M.",
    role: "Parent",
    avatar: "S",
  },
  {
    quote: "As an educator, I've seen how early identification changes outcomes. MENTIS makes screening accessible and reliable for every child.",
    author: "James K.",
    role: "Elementary School Teacher",
    avatar: "J",
  },
  {
    quote: "The detailed reports helped us create a personalized learning plan. My son is now thriving in school thanks to early intervention.",
    author: "Lisa T.",
    role: "Parent",
    avatar: "L",
  },
];

export function Testimonials() {
  const sectionRef = useRef<HTMLElement>(null);
  const { hasBeenInView } = useElementInView(sectionRef, { threshold: 0.2 });

  return (
    <section
      ref={sectionRef}
      className="py-24 lg:py-32 bg-gradient-to-b from-background to-secondary/20"
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
            Trusted by Families
          </div>
          
          <h2
            className={cn(
              "text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6 opacity-0",
              hasBeenInView && "animate-fade-in-up delay-100"
            )}
            style={{ fontFamily: "var(--font-fredoka)" }}
          >
            Stories of <span className="text-primary">success</span>
          </h2>
          
          <p
            className={cn(
              "text-lg text-muted-foreground opacity-0",
              hasBeenInView && "animate-fade-in-up delay-200"
            )}
          >
            Hear from parents and educators who have experienced the difference MENTIS makes
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.author}
              className={cn(
                "relative p-8 rounded-3xl bg-card border border-border/50 shadow-sm opacity-0",
                hasBeenInView && "animate-fade-in-up"
              )}
              style={{ animationDelay: `${300 + index * 150}ms` }}
            >
              {/* Quote mark */}
              <div className="absolute top-6 right-6 text-6xl text-primary/10 font-serif leading-none">
                &ldquo;
              </div>
              
              <div className="relative">
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className="w-5 h-5 text-accent"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>

                {/* Quote */}
                <p className="text-muted-foreground leading-relaxed mb-6">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-bold text-primary">
                      {testimonial.avatar}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">
                      {testimonial.author}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
