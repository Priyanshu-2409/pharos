"use client";

import dynamic from "next/dynamic";

// Three.js is only loaded on the client, after first paint.
const Beam = dynamic(() => import("./Beam"), { ssr: false });

/** CSS-only sweep shown beneath the WebGL scene, and alone when WebGL is
 *  unavailable or the user prefers reduced motion. */
export function HeroScene() {
  return (
    <div className="relative h-full w-full overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative aspect-square w-[140%] max-w-none rounded-full border border-line/60">
          <div className="animate-sweep absolute inset-0 [background:conic-gradient(from_0deg,transparent_0deg,rgba(232,196,106,0.14)_18deg,transparent_36deg)]" />
          <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-beam" />
        </div>
      </div>
      <Beam />
      {/* fade into the page so the disc never has a hard edge */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,var(--color-ink)_78%)]" />
    </div>
  );
}