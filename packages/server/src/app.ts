import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { JwtVariables } from 'hono/jwt';
import { logger } from 'hono/logger';

const app = new Hono<{ Variables: JwtVariables }>()
  .basePath('/api')
  .use(logger())
  .use(
    cors({
      origin: ['http://localhost:5173'],
    })
  )

export default app;
