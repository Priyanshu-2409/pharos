import { Router, type Request, type Response } from "express";
import { prisma } from "@pharos/db";

export const publicStatusRouter = Router();

// Window for uptime calculation and incident history
const HISTORY_WINDOW_DAYS = 30;

// GET /api/public/status/:slug — public endpoint, no auth required
publicStatusRouter.get("/:slug", async (req: Request, res: Response) => {
  const slug = req.params.slug as string;

  // Fetch the status page + its monitors + latest check per monitor
  const page = await prisma.statusPage.findFirst({
    where: { slug, isPublic: true },
    include: {
      monitors: {
        orderBy: { displayOrder: "asc" },
        include: {
          monitor: {
            include: {
              // Latest check for current status display
              checks: {
                orderBy: { checkedAt: "desc" },
                take: 1,
              },
              // Recent incidents for history section
              incidents: {
                where: {
                  startedAt: {
                    gte: new Date(Date.now() - HISTORY_WINDOW_DAYS * 24 * 60 * 60 * 1000),
                  },
                },
                orderBy: { startedAt: "desc" },
              },
            },
          },
        },
      },
    },
  });

  if (!page) {
    return res.status(404).json({ error: "Status page not found" });
  }

  // Uptime % over the last N days — one query per monitor
  const windowStart = new Date(Date.now() - HISTORY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const uptimeByMonitor: Record<string, number | null> = {};

  for (const spm of page.monitors) {
    const totalChecks = await prisma.check.count({
      where: {
        monitorId: spm.monitor.id,
        checkedAt: { gte: windowStart },
      },
    });

    if (totalChecks === 0) {
      uptimeByMonitor[spm.monitor.id] = null;
      continue;
    }

    const upChecks = await prisma.check.count({
      where: {
        monitorId: spm.monitor.id,
        checkedAt: { gte: windowStart },
        result: "UP",
      },
    });

    uptimeByMonitor[spm.monitor.id] = (upChecks / totalChecks) * 100;
  }

  // Flatten for the frontend
  const response = {
    title: page.title,
    description: page.description,
    monitors: page.monitors.map((spm) => {
      const monitor = spm.monitor;
      const latest = monitor.checks[0];
      return {
        id: monitor.id,
        name: spm.displayName ?? monitor.name,
        url: monitor.url,
        currentStatus: latest?.result ?? null,
        latestResponseTime: latest?.responseTime ?? null,
        latestCheckedAt: latest?.checkedAt ?? null,
        uptimePercent: uptimeByMonitor[monitor.id],
        incidents: monitor.incidents.map((inc) => ({
          id: inc.id,
          startedAt: inc.startedAt,
          resolvedAt: inc.resolvedAt,
          summary: inc.summary,
          status: inc.status,
        })),
      };
    }),
    windowDays: HISTORY_WINDOW_DAYS,
  };

  return res.json(response);
});