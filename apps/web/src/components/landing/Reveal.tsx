"use client";

import { useEffect, useRef } from "react";

type From = "left" | "right" | "up" | "card";

const HIDDEN: Record<From, string> = {
  left: "translate3d(-64px,0,0)",
  right: "translate3d(64px,0,0)",
  up: "translate3d(0,40px,0)",
  // deck-of-cards: rises from below with a slight tilt, straightens on arrival
  card: "translate3d(0,80px,0) rotate(-6deg) scale(0.94)",
};

function show(el: HTMLElement) {
  el.style.opacity = "1";
  el.style.transform = "none";
  el.style.willChange = "auto";
}

/**
 * Scroll-triggered reveal. Renders children hidden + offset, then transitions
 * them into place the first time they enter the viewport. No library, no
 * scroll listener, no re-render — one IntersectionObserver per element that
 * flips inline styles and disconnects. Respects prefers-reduced-motion.
 */
export function Reveal({
  from = "up",
  delay = 0,
  className = "",
  children,
  as: Tag = "div",
}: {
  from?: From;
  delay?: number;
  className?: string;
  children: React.ReactNode;
  as?: "div" | "li" | "article" | "section";
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.transition = "none";
      show(el);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          show(el);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      className={className}
      style={{
        opacity: 0,
        transform: HIDDEN[from],
        transformOrigin: from === "card" ? "50% 100%" : undefined,
        transition: `opacity 0.8s cubic-bezier(0.2,0.7,0.2,1) ${delay}ms, transform 0.9s cubic-bezier(0.2,0.7,0.2,1) ${delay}ms`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </Tag>
  );
}
