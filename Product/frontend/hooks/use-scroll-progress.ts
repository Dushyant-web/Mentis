"use client";

import { useState, useEffect, RefObject } from "react";

interface ScrollProgressOptions {
  threshold?: number;
  offset?: number;
}

export function useScrollProgress(
  ref: RefObject<HTMLElement | null>,
  options: ScrollProgressOptions = {}
) {
  const { threshold = 0, offset = 0 } = options;
  const [progress, setProgress] = useState(0);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleScroll = () => {
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const elementHeight = rect.height;
      
      // Calculate how far through the element we've scrolled
      const scrollStart = windowHeight - offset;
      const scrollEnd = -elementHeight + offset;
      const scrollRange = scrollStart - scrollEnd;
      
      const currentPosition = rect.top;
      const rawProgress = (scrollStart - currentPosition) / scrollRange;
      
      // Clamp between 0 and 1
      const clampedProgress = Math.max(0, Math.min(1, rawProgress));
      
      setProgress(clampedProgress);
      setIsInView(clampedProgress > threshold && clampedProgress < 1 - threshold);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial calculation

    return () => window.removeEventListener("scroll", handleScroll);
  }, [ref, threshold, offset]);

  return { progress, isInView };
}

export function useElementInView(
  ref: RefObject<HTMLElement | null>,
  options: { threshold?: number; rootMargin?: string } = {}
) {
  const { threshold = 0.1, rootMargin = "0px" } = options;
  const [isInView, setIsInView] = useState(false);
  const [hasBeenInView, setHasBeenInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
        if (entry.isIntersecting) {
          setHasBeenInView(true);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [ref, threshold, rootMargin]);

  return { isInView, hasBeenInView };
}
