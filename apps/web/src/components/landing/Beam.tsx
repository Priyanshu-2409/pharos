"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * The Pharos beam: a lighthouse sweep over a field of endpoints.
 * Deliberately cheap — one wedge mesh, one Points cloud, no post-processing,
 * DPR capped at 1.5, paused when the tab is hidden.
 */
export default function Beam() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: true,
        powerPreference: "low-power",
      });
    } catch {
      return; // no WebGL — CSS fallback underneath stays visible
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 7.5, 9);
    camera.lookAt(0, 0, 0);

    // --- endpoints -----------------------------------------------------
    const COUNT = 520;
    const RADIUS = 6.2;
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const angles = new Float32Array(COUNT);
    const base = new Float32Array(COUNT);
    const down = new Set<number>([41, 187, 366]); // three "incidents"

    for (let i = 0; i < COUNT; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * RADIUS;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = Math.sin(a) * r;
      angles[i] = a;
      base[i] = 0.12 + Math.random() * 0.1;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const points = new THREE.Points(
      geom,
      new THREE.PointsMaterial({
        size: 0.075,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    scene.add(points);

    // --- beam wedge ----------------------------------------------------
    const WEDGE = 0.42; // radians
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.absarc(0, 0, RADIUS + 1.5, -WEDGE / 2, WEDGE / 2, false);
    shape.lineTo(0, 0);
    const wedge = new THREE.Mesh(
      new THREE.ShapeGeometry(shape, 24),
      new THREE.MeshBasicMaterial({
        color: 0xe8c46a,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    wedge.rotation.x = -Math.PI / 2;
    scene.add(wedge);

    // faint horizon ring so the disc reads as a surface
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(RADIUS - 0.02, RADIUS + 0.02, 96),
      new THREE.MeshBasicMaterial({
        color: 0x232735,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    scene.add(ring);

    // lighthouse pivot
    const pivot = new THREE.Mesh(
      new THREE.CircleGeometry(0.09, 24),
      new THREE.MeshBasicMaterial({ color: 0xe8c46a }),
    );
    pivot.rotation.x = -Math.PI / 2;
    pivot.position.y = 0.01;
    scene.add(pivot);

    // --- sizing --------------------------------------------------------
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = mount;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    // --- loop ----------------------------------------------------------
    const beam = new THREE.Color(0xe8c46a);
    const okc = new THREE.Color(0x8b93a6);
    const bad = new THREE.Color(0xe5484d);
    const tmp = new THREE.Color();
    const colorAttr = geom.getAttribute("color") as THREE.BufferAttribute;

    let raf = 0;
    let running = true;
    let last = performance.now();
    let theta = 0;
    const SPEED = (Math.PI * 2) / 9000; // one sweep per 9s

    const tick = (now: number) => {
      if (!running) return;
      const dt = Math.min(now - last, 50);
      last = now;
      theta = (theta + SPEED * dt) % (Math.PI * 2);
      wedge.rotation.z = -theta;

      for (let i = 0; i < COUNT; i++) {
        let d = Math.abs(angles[i] - theta);
        if (d > Math.PI) d = Math.PI * 2 - d;
        // bright inside the wedge, then a slow afterglow trailing behind it
        const trail = theta - angles[i] < 0 ? theta - angles[i] + Math.PI * 2 : theta - angles[i];
        const glow = Math.max(
          d < WEDGE / 2 ? 1 : 0,
          trail < 1.6 ? 1 - trail / 1.6 : 0,
        );
        const b = base[i] + glow * 0.9;
        if (down.has(i)) {
          tmp.copy(bad).multiplyScalar(0.55 + glow * 0.9);
        } else {
          tmp.copy(okc).lerp(beam, glow).multiplyScalar(b);
        }
        colors[i * 3] = tmp.r;
        colors[i * 3 + 1] = tmp.g;
        colors[i * 3 + 2] = tmp.b;
      }
      colorAttr.needsUpdate = true;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      ro.disconnect();
      geom.dispose();
      (points.material as THREE.Material).dispose();
      wedge.geometry.dispose();
      (wedge.material as THREE.Material).dispose();
      ring.geometry.dispose();
      (ring.material as THREE.Material).dispose();
      pivot.geometry.dispose();
      (pivot.material as THREE.Material).dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 [&>canvas]:h-full [&>canvas]:w-full" />;
}