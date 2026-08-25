import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { toNodeHandler } from 'better-auth/node';
import { prisma } from '@pharos/db';
import { auth } from './lib/auth.js';
import { requireAuth } from "./middleware/requireAuth.js";
import { monitorsRouter } from "./routes/monitors.js";
import { settingsRouter } from "./routes/settings.js";
import { publicStatusRouter } from "./routes/publicStatus.js";
import { statusPagesRouter } from "./routes/statusPages.js";
import { billingRouter } from "./routes/billing.js";
import { billingWebhookRouter } from "./routes/billingWebhook.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";

app.set("trust proxy", 1);

// CORS — must allow credentials for cookies to cross origins
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

app.use("/api/settings", settingsRouter);
// Better Auth handler — mounted BEFORE express.json()
// because Better Auth reads the raw request body itself.
app.use('/api/auth', toNodeHandler(auth));

// Razorpay webhook — raw body parser, must precede express.json()
app.use('/api/billing/webhook', billingWebhookRouter);

app.use("/api/public/status", publicStatusRouter);

app.use("/api/status-pages", statusPagesRouter);

// JSON parser for all OTHER routes (must come AFTER auth mount)
app.use(express.json());

app.use("/api/billing", billingRouter);

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'pharos-api' });
});

app.get('/db-health', async (_req: Request, res: Response) => {
  try {
    const userCount = await prisma.user.count();
    const monitorCount = await prisma.monitor.count();
    res.json({
      status: 'ok',
      database: 'connected',
      counts: { users: userCount, monitors: monitorCount },
    });
  } catch (error) {
    console.error('Database connection failed:', error);
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.use("/api/monitors", monitorsRouter);

app.listen(PORT, () => {
  console.log(`🗼 Pharos API running on http://localhost:${PORT}`);
});

app.get("/api/me", requireAuth, (req, res) => {
  // If we're here, requireAuth already validated the session
  // and attached req.user. TypeScript knows this too.
  res.json({
    user: req.user,
    session: req.session,
  });
}); 
