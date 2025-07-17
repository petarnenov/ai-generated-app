import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import prRoutes from '../server/routes/pr';
import gitlabRoutes from '../server/routes/gitlab';
import aiRoutes from '../server/routes/ai';
import { errorHandler } from '../server/middleware/errorHandler';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/pr', prRoutes);
app.use('/api/gitlab', gitlabRoutes);
app.use('/api/ai', aiRoutes);

// Error handling
app.use(errorHandler);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}
