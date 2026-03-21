"use client";

import { useEffect, useState, useRef, useCallback } from "react";

interface Letter {
  id: number;
  char: string;
  x: number;
  y: number;
  baseSize: number;
  currentSize: number;
  rotation: number;
  color: string;
  glows: boolean;
  floatOffset: number;
  floatSpeed: number;
  driftX: number;
  driftY: number;
}

const DYSLEXIA_LETTERS = [
  "b", "d", "p", "q", "m", "w", "n", "u", "a", "e", "i", "o",
  "B", "D", "P", "Q", "M", "W", "N", "A", "E", "O",
  "s", "z", "S", "Z", "c", "C", "g", "G", "h", "H"
];

const COLORS = [
  "rgb(249, 115, 22)",   // orange-500
  "rgb(251, 146, 60)",   // orange-400
  "rgb(253, 186, 116)",  // orange-300
  "rgb(254, 215, 170)",  // orange-200
  "rgb(234, 88, 12)",    // orange-600
  "rgb(255, 237, 213)",  // orange-100
];

export function JumbleLetters() {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [scrollCount, setScrollCount] = useState(0);
  const [pageHeight, setPageHeight] = useState(0);
  const lastScrollY = useRef(0);
  const scrollThreshold = useRef(0);
  const animationRef = useRef<number>(0);
  const timeRef = useRef(0);

  // Track full page height
  useEffect(() => {
    const updatePageHeight = () => {
      const fullHeight = Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.clientHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight
      );
      setPageHeight(fullHeight);
    };

    updatePageHeight();
    
    // Update on resize and after content loads
    window.addEventListener("resize", updatePageHeight);
    const resizeObserver = new ResizeObserver(updatePageHeight);
    resizeObserver.observe(document.body);
    
    // Also update periodically to catch dynamic content
    const interval = setInterval(updatePageHeight, 1000);

    return () => {
      window.removeEventListener("resize", updatePageHeight);
      resizeObserver.disconnect();
      clearInterval(interval);
    };
  }, []);

  // Generate random letters distributed across full page height
  useEffect(() => {
    if (pageHeight === 0) return;

    const generateLetters = () => {
      const newLetters: Letter[] = [];
      const letterCount = 60; // More letters for full page coverage

      for (let i = 0; i < letterCount; i++) {
        const baseSize = Math.random() * 50 + 24; // 24-74px
        newLetters.push({
          id: i,
          char: DYSLEXIA_LETTERS[Math.floor(Math.random() * DYSLEXIA_LETTERS.length)],
          x: Math.random() * 100,
          y: Math.random() * 100, // Percentage of full page height
          baseSize,
          currentSize: baseSize,
          rotation: Math.random() * 60 - 30, // -30 to 30 degrees
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          glows: Math.random() > 0.6, // 40% chance to glow
          floatOffset: Math.random() * Math.PI * 2,
          floatSpeed: 0.3 + Math.random() * 1.2,
          driftX: (Math.random() - 0.5) * 0.015,
          driftY: (Math.random() - 0.5) * 0.008,
        });
      }
      return newLetters;
    };

    setLetters(generateLetters());
  }, [pageHeight]);

  // Animation loop for floating effect
  useEffect(() => {
    const animate = () => {
      timeRef.current += 0.016; // ~60fps
      
      setLetters(prev => prev.map(letter => {
        // Slow drift
        let newX = letter.x + letter.driftX;
        let newY = letter.y + letter.driftY;
        
        // Wrap around edges
        if (newX > 105) newX = -5;
        if (newX < -5) newX = 105;
        if (newY > 102) newY = -2;
        if (newY < -2) newY = 102;

        return {
          ...letter,
          x: newX,
          y: newY,
        };
      }));

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, []);

  // Handle scroll for size changes
  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    const scrollDelta = Math.abs(currentScrollY - lastScrollY.current);
    
    // Only trigger on significant scroll (every ~100px)
    if (scrollDelta > 80) {
      scrollThreshold.current += scrollDelta;
      
      if (scrollThreshold.current > 100) {
        setScrollCount(prev => prev + 1);
        scrollThreshold.current = 0;
        
        // Update letter sizes based on even/odd scroll count
        setLetters(prev => prev.map(letter => {
          const isEvenScroll = (scrollCount + 1) % 2 === 0;
          const sizeMultiplier = isEvenScroll ? 1.25 : 0.85;
          const targetSize = letter.baseSize * sizeMultiplier;
          
          return {
            ...letter,
            currentSize: targetSize,
          };
        }));
      }
      
      lastScrollY.current = currentScrollY;
    }
  }, [scrollCount]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Smooth size transition back to base after scroll stops
  useEffect(() => {
    const timeout = setTimeout(() => {
      setLetters(prev => prev.map(letter => ({
        ...letter,
        currentSize: letter.baseSize,
      })));
    }, 800);

    return () => clearTimeout(timeout);
  }, [scrollCount]);

  return (
    <div 
      className="absolute inset-x-0 top-0 pointer-events-none overflow-hidden z-0" 
      style={{ height: `${pageHeight}px` }}
      aria-hidden="true"
    >
      {letters.map((letter) => {
        const floatY = Math.sin(timeRef.current * letter.floatSpeed + letter.floatOffset) * 10;
        const floatX = Math.cos(timeRef.current * letter.floatSpeed * 0.7 + letter.floatOffset) * 6;
        const topPosition = (letter.y / 100) * pageHeight;
        
        return (
          <span
            key={letter.id}
            className="absolute font-display font-bold select-none"
            style={{
              left: `${letter.x}%`,
              top: `${topPosition}px`,
              fontSize: `${letter.currentSize}px`,
              color: letter.color,
              opacity: letter.glows ? 0.4 : 0.2,
              transform: `
                translate(${floatX}px, ${floatY}px)
                rotate(${letter.rotation + Math.sin(timeRef.current * 0.5) * 3}deg)
              `,
              transition: "font-size 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
              textShadow: letter.glows
                ? `0 0 25px ${letter.color}, 0 0 50px ${letter.color}, 0 0 75px ${letter.color}`
                : "none",
              filter: letter.glows ? "blur(0.5px)" : "none",
              willChange: "transform, font-size",
            }}
          >
            {letter.char}
          </span>
        );
      })}
    </div>
  );
}
