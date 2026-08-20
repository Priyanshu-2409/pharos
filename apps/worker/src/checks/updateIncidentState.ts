import { prisma } from "@pharos/db";
import { sendIncidentOpenedEmail, sendIncidentResolvedEmail } from "../alerts/sendIncidentEmail.js";

const CONSECUTIVE_FAILURES_TO_OPEN = 3;

/**
 * Called after every check is written. Decides whether to open, close,
 * or leave the incident state alone based on recent check history.
 *
 * On state transitions, dispatches email alerts to every EMAIL notification
 * channel owned by the monitor's user. Each dispatch attempt is recorded
 * as an Alert row for audit + observability.
 */
export async function updateIncidentState(monitorId: string): Promise<void> {
  const recentChecks = await prisma.check.findMany({
    where: { monitorId },
    orderBy: { checkedAt: "desc" },
    take: CONSECUTIVE_FAILURES_TO_OPEN,
  });

  if (recentChecks.length === 0) {
    return;
  }

  const latest = recentChecks[0];

  const openIncident = await prisma.incident.findFirst({
    where: { monitorId, status: "ONGOING" },
  });

  // ─── Case 1: Latest check is UP → close incident if one is open ──────
  if (latest.result === "UP") {
    if (openIncident) {
      const resolvedAt = new Date();
      const resolved = await prisma.incident.update({
        where: { id: openIncident.id },
        data: {
          status: "RESOLVED",
          resolvedAt,
        },
      });
      console.log(`  🟢 Incident ${openIncident.id} resolved for monitor ${monitorId}`);
      await dispatchAlerts(resolved, monitorId, "RESOLVED");
    }
    return;
  }

  // ─── Case 2: Latest DOWN + incident already open → nothing to do ────
  if (openIncident) {
    return;
  }

  // ─── Case 3: Latest DOWN + not open + streak long enough → open ─────
  if (recentChecks.length < CONSECUTIVE_FAILURES_TO_OPEN) {
    return;
  }

  const allDown = recentChecks.every((c) => c.result === "DOWN");
  if (!allDown) {
    return;
  }

  const newIncident = await prisma.incident.create({
    data: {
      monitorId,
      status: "ONGOING",
      summary: latest.errorMessage ?? "Monitor is down",
    },
  });

  console.log(`  🔴 Incident ${newIncident.id} opened for monitor ${monitorId}`);
  await dispatchAlerts(newIncident, monitorId, "OPENED");
}

/**
 * Sends email alerts to every EMAIL notification channel owned by the monitor's user.
 * Records one Alert row per channel attempted (success or failure).
 * Silent failures — email problems must not break check processing.
 */
async function dispatchAlerts(
  incident: { id: string; startedAt: Date; resolvedAt: Date | null; summary: string | null },
  monitorId: string,
  transition: "OPENED" | "RESOLVED",
): Promise<void> {
  try {
    // Fetch the monitor + owner + all their EMAIL channels
    const monitor = await prisma.monitor.findUnique({
      where: { id: monitorId },
      include: {
        user: {
          include: {
            notificationChannels: {
              where: { type: "EMAIL", isVerified: true },
            },
          },
        },
      },
    });

    if (!monitor) return;
    const channels = monitor.user.notificationChannels;
    if (channels.length === 0) {
      console.log(`  ⚠️  No verified EMAIL channels for user, skipping alerts`);
      return;
    }

    for (const channel of channels) {
      // channel.config is JSON like { email: "user@example.com" }
      const to = (channel.config as { email?: string }).email;
      if (!to) continue;

      const result =
        transition === "OPENED"
          ? await sendIncidentOpenedEmail({
              to,
              monitorName: monitor.name,
              monitorUrl: monitor.url,
              errorMessage: incident.summary,
              startedAt: incident.startedAt,
            })
          : await sendIncidentResolvedEmail({
              to,
              monitorName: monitor.name,
              monitorUrl: monitor.url,
              startedAt: incident.startedAt,
              resolvedAt: incident.resolvedAt ?? new Date(),
            });

      await prisma.alert.create({
        data: {
          incidentId: incident.id,
          notificationChannelId: channel.id,
          success: result.success,
          errorMessage: result.success ? null : result.errorMessage,
        },
      });

      if (result.success) {
        console.log(`  📧 Alert sent to ${to} (${transition})`);
      } else {
        console.log(`  ❌ Alert to ${to} failed: ${result.errorMessage}`);
      }
    }
  } catch (err) {
    // Never let alerting failure crash check processing
    console.error(`  ❌ dispatchAlerts crashed:`, err);
  }
}