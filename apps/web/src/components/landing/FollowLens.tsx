"use client";

import { useEffect, useRef } from "react";

/**
 * Lagging cursor dot that blooms into a magnifying lens over readable content.
 * Magnification keeps a static snapshot clone of <main> inside the lens,
 * scaled and counter-translated so the point under the dot lands at the lens
 * center. Desktop pointers only — the (pointer: fine) guard means it never
 * starts on phones or tablets.
 */
const R = 62; // lens radius (lens is 124px)
const ZOOM = 1.6; // magnification
const DOT = 0.09; // lens scale in "dot" mode (~11px dot)
const LAG = 0.16; // follow lag (lower = lazier)

// Elements the lens magnifies over. Everything else keeps the small dot.
const MAGNIFY_SELECTOR = "p, li, h1, h2, h3, h4, summary, .lens-target";

export default function FollowLens() {
  const lensRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lens = lensRef.current;
    const dot = dotRef.current;
    const content = contentRef.current;
    if (!lens || !dot || !content) return;

    let mx = -1000,
      my = -1000; // mouse
    let dx = -1000,
      dy = -1000; // lagged dot
    let k = DOT,
      kTarget = DOT; // lens scale (dot ↔ lens)
    let visible = false;
    let snapDirty = true;
    let raf = 0;

    const snapshot = () => {
      const main = document.querySelector("main");
      if (!main) return;
      const clone = main.cloneNode(true) as HTMLElement;
      // Drop anything that can't or shouldn't be cloned into the lens.
      clone
        .querySelectorAll("canvas, video, iframe, .follow-lens")
        .forEach((n) => n.remove());
      clone.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
      content.replaceChildren(clone);
      content.style.width = document.documentElement.clientWidth + "px";
      snapDirty = false;
    };

    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!visible) return;
      dx += (mx - dx) * LAG;
      dy += (my - dy) * LAG;
      k += (kTarget - k) * 0.18;
      lens.style.transform = `translate(${dx - R}px, ${dy - R}px) scale(${k})`;
      // fade dot out / snapshot in as the lens blooms
      const t = Math.min(1, Math.max(0, (k - DOT) / (1 - DOT)));
      dot.style.opacity = String(1 - t);
      content.style.opacity = t > 0.55 ? "1" : "0";
      // magnified point = page point under the (lagged) dot
      const px = dx;
      const py = dy + window.scrollY;
      content.style.transform = `translate(${R - ZOOM * px}px, ${R - ZOOM * py}px) scale(${ZOOM})`;
    };

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (snapDirty) snapshot();
      const el = e.target instanceof Element ? e.target : null;
      kTarget = el && el.closest(MAGNIFY_SELECTOR) ? 1 : DOT;
      if (!visible) {
        visible = true;
        dx = mx;
        dy = my;
        lens.classList.add("on");
      }
    };
    const onLeave = () => {
      visible = false;
      lens.classList.remove("on");
    };
    const invalidate = () => {
      snapDirty = true;
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    window.addEventListener("resize", invalidate);
    window.addEventListener("scroll", invalidate, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("resize", invalidate);
      window.removeEventListener("scroll", invalidate);
    };
  }, []);

  return (
    <div ref={lensRef} className="follow-lens" aria-hidden="true">
      <div ref={contentRef} className="lens-content" />
      <div ref={dotRef} className="lens-dot" />
    </div>
  );
}
