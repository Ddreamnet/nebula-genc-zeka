"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Scroll-reveal wrapper. Fades + lifts children into view once.
 * GPU-cheap (opacity/transform only); disabled via CSS under prefers-reduced-motion.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShow(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShow(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-show={show}
      className={cn("reveal", className)}
      style={delay ? { ...style, transitionDelay: `${delay}ms` } : style}
    >
      {children}
    </div>
  );
}
