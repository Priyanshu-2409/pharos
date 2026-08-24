import "dotenv/config";
import { Worker } from "bullmq";
import {Redis} from "ioredis";
import { prisma } from "@pharos/db";
import { performCheck } from "./checks/performCheck.js";
// ─── Bootstrap: ensure all existing ACTIVE monitors are scheduled ───
import { Queue } from "bullmq";
import { updateIncidentState } from "./checks/updateIncidentState.js";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

const MONITOR_CHECK_QUEUE = "monitor-check";

console.log("👷 Pharos worker starting…");
console.log(`   Redis: ${REDIS_URL}`);
console.log(`   Queue: ${MONITOR_CHECK_QUEUE}`);

const monitorCheckQueue = new Queue("monitor-check", { connection });

async function bootstrapSchedulers() {
  const activeMonitors = await prisma.monitor.findMany({
    where: { status: "ACTIVE" },
  });

  for (const monitor of activeMonitors) {
    await monitorCheckQueue.upsertJobScheduler(
      `monitor:${monitor.id}`,
      { every: monitor.intervalSeconds * 1000 },
      { name: "check", data: { monitorId: monitor.id } }
    );
  }

  console.log(`⚙  Bootstrapped ${activeMonitors.length} monitor scheduler(s)`);
}

await bootstrapSchedulers();

const worker = new Worker(
  MONITOR_CHECK_QUEUE,
  async (job) => {
    console.log(`\n[job ${job.id}] received:`, job.data);

    const { monitorId } = job.data as { monitorId: string };

    // Fetch fresh monitor state from DB — never trust the job payload snapshot
    const monitor = await prisma.monitor.findUnique({
      where: { id: monitorId },
    });

    if (!monitor) {
      console.log(`[job ${job.id}] monitor ${monitorId} not found, skipping`);
      return;
    }

    if (monitor.status !== "ACTIVE") {
      console.log(`[job ${job.id}] monitor ${monitor.name} is ${monitor.status}, skipping`);
      return;
    }

    console.log(`[job ${job.id}] checking: ${monitor.name} → ${monitor.url}`);

const result = await performCheck({
  url: monitor.url,
  method: monitor.method,
  timeoutMs: monitor.timeoutMs,
  expectedStatus: monitor.expectedStatus,
});

console.log(
  `[job ${job.id}] result: ${result.result} (${result.statusCode ?? "no response"}, ${result.responseTimeMs}ms)`
);

// Write the Check row
const check = await prisma.check.create({                                                   
  data: {
    monitorId: monitor.id,
    result: result.result,
    statusCode: result.statusCode,
    responseTime: result.responseTimeMs,  // schema field is responseTime (no "Ms")
    errorMessage: result.errorMessage,
  },
});

// After every check, re-evaluate whether an incident should be opened or closed.
await updateIncidentState(monitor.id);

return { checkId: check.id, result: result.result };
  },
  { connection }
);

worker.on("completed", (job) => {
  console.log(`[job ${job.id}] ✓ completed`);
});

worker.on("failed", (job, err) => {
  console.log(`[job ${job?.id}] ✗ failed:`, err.message);
});

console.log("👂 Listening for jobs…");