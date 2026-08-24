import { Queue } from "bullmq";
import { Redis } from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

export const redisConnection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const MONITOR_CHECK_QUEUE = "monitor-check";

export const monitorCheckQueue = new Queue(MONITOR_CHECK_QUEUE, {
  connection: redisConnection,
});

// ─── Scheduler helpers ─────────────────────────────────────────

function schedulerIdFor(monitorId: string) {
  return `monitor:${monitorId}`;
}

/**
 * Register or update a repeating check for this monitor.
 * Called on create and on interval-change updates.
 */
export async function scheduleMonitorChecks(monitorId: string, intervalSeconds: number) {
  await monitorCheckQueue.upsertJobScheduler(
    schedulerIdFor(monitorId),
    { every: intervalSeconds * 1000 },
    {
      name: "check",
      data: { monitorId },
    }
  );
}

/**
 * Remove the scheduler for this monitor. Called on delete.
 */
export async function unscheduleMonitorChecks(monitorId: string) {
  await monitorCheckQueue.removeJobScheduler(schedulerIdFor(monitorId));
}

/**
 * Fire a single check right now. Called on create so the user
 * doesn't wait one full interval for the first check.
 */
export async function enqueueImmediateCheck(monitorId: string) {
  await monitorCheckQueue.add("check", { monitorId });
}