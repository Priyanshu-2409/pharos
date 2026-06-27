import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from '@pharos/db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'pharos-api' });
});

app.get('/db-health', async (req: Request, res: Response) => {
  try {
    const userCount = await prisma.user.count();
    const monitorCount = await prisma.monitor.count();
    res.json({
      status: 'ok',
      database: 'connected',
      counts: {
        users: userCount,
        monitors: monitorCount,
      },
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

app.listen(PORT, () => {
  console.log(`🗼 Pharos API running on http://localhost:${PORT}`);
});