import { useState, useEffect, useRef, useCallback } from 'react';

interface TaglineItem {
  main: string;
  sub: string;
}

export const useRotatingTagline = (taglines: TaglineItem[]) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [ctaPulse, setCtaPulse] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  const rotateTagline = useCallback(() => {
    if (prefersReducedMotion) return;
    
    setIsExiting(true);
    
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % taglines.length);
      setIsExiting(false);
      setCtaPulse(true);
      setTimeout(() => setCtaPulse(false), 180);
    }, 350); // Exit duration
  }, [taglines.length, prefersReducedMotion]);

  // Rotation effect - 4.2s idle + animation time = ~5s total
  useEffect(() => {
    if (isPaused || prefersReducedMotion || taglines.length <= 1) return;
    
    intervalRef.current = setInterval(rotateTagline, 5000);
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused, rotateTagline, prefersReducedMotion, taglines.length]);

  // Scroll pause detection
  useEffect(() => {
    if (prefersReducedMotion) return;

    const handleScroll = () => {
      setIsPaused(true);
      
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        // Check if hero is still visible
        if (heroRef.current) {
          const rect = heroRef.current.getBoundingClientRect();
          const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
          setIsPaused(!isVisible);
        } else {
          setIsPaused(false);
        }
      }, 1200); // Resume after 1.2s
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [prefersReducedMotion]);

  // IntersectionObserver for visibility
  useEffect(() => {
    if (prefersReducedMotion || !heroRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          setIsPaused(true);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  const currentTagline = taglines[currentIndex] || taglines[0];

  return {
    heroRef,
    currentTagline,
    isExiting,
    ctaPulse,
    prefersReducedMotion,
  };
};