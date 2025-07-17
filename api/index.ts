import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import prRoutes from '../server/routes/pr.js';
import gitlabRoutes from '../server/routes/gitlab.js';
import aiRoutes from '../server/routes/ai.js';
import { errorHandler } from '../server/middleware/errorHandler.js';

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
