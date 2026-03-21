"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import { useElementInView } from "@/hooks/use-scroll-progress";
import { Button } from "@/components/ui/button";

export function CTA() {
  const sectionRef = useRef<HTMLElement>(null);
  const { hasBeenInView } = useElementInView(sectionRef, { threshold: 0.3 });

  return (
    <section
      ref={sectionRef}
      id="contact"
      className="py-24 lg:py-32 bg-background relative overflow-hidden"
    >
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px]">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-full blur-3xl animate-pulse-soft" />
        </div>
      </div>

      <div className="container mx-auto px-6 lg:px-12 relative">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-gradient-to-br from-primary via-primary to-primary/90 rounded-[2.5rem] p-8 lg:p-16 text-center overflow-hidden shadow-2xl">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
              <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="2" fill="currentColor" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#dots)" />
              </svg>
            </div>

            {/* Floating shapes */}
            <div className="absolute top-8 left-8 w-16 h-16 bg-background/10 rounded-2xl rotate-12 animate-float" />
            <div className="absolute bottom-12 right-12 w-12 h-12 bg-background/10 rounded-full animate-float delay-300" />
            <div className="absolute top-1/2 right-8 w-8 h-8 bg-background/10 rounded-lg -rotate-12 animate-float delay-500" />

            <div className="relative">
              <h2
                className={cn(
                  "text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6 opacity-0",
                  hasBeenInView && "animate-fade-in-up"
                )}
                style={{ fontFamily: "var(--font-fredoka)" }}
              >
                Start your child&apos;s journey today
              </h2>

              <p
                className={cn(
                  "text-lg lg:text-xl text-primary-foreground/90 max-w-2xl mx-auto mb-10 opacity-0",
                  hasBeenInView && "animate-fade-in-up delay-100"
                )}
              >
                Early screening can make all the difference. Give your child the support 
                they deserve with MENTIS&apos;s comprehensive dyslexia screening.
              </p>

              <div
                className={cn(
                  "flex flex-col sm:flex-row items-center justify-center gap-4 opacity-0",
                  hasBeenInView && "animate-fade-in-up delay-200"
                )}
              >
                <Button
                  size="lg"
                  className="rounded-full px-10 py-6 text-lg bg-background text-primary hover:bg-background/90 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1"
                >
                  Get Started Free
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full px-10 py-6 text-lg border-2 border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
                >
                  Learn More
                </Button>
              </div>

              <div
                className={cn(
                  "mt-10 flex items-center justify-center gap-8 text-sm text-primary-foreground/70 opacity-0",
                  hasBeenInView && "animate-fade-in-up delay-300"
                )}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Free trial available
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  No credit card required
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
