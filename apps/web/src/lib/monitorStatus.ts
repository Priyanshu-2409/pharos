import type { Monitor } from "./api";

export type StatusIndicator = {
  emoji: string;
  color: string;
  label: string;
};

export function getStatusIndicator(monitor: Monitor): StatusIndicator {
  // Paused monitors always look "paused" regardless of last check
  if (monitor.status === "PAUSED") {
    return { emoji: "⏸️", color: "#888", label: "Paused" };
  }

  // No checks yet — monitor just created
  if (!monitor.latestCheck) {
    return { emoji: "⏳", color: "#888", label: "Pending first check" };
  }

  const result = monitor.latestCheck.result;

  if (result === "UP") {
    return { emoji: "🟢", color: "#2ea043", label: "Healthy" };
  }
  if (result === "DEGRADED") {
    return { emoji: "🟡", color: "#d29922", label: "Degraded" };
  }
  return { emoji: "🔴", color: "#f85149", label: "Down" };
}

/**
 * "12s ago", "3m ago", "1h ago" — human-readable relative time.
 */
export function timeSince(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}