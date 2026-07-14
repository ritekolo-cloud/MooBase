import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.preprocess((val) => Number(val), z.number().default(5000)),
  JWT_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  // Individual DB_* vars are only needed for local dev tooling.
  // Prisma connects exclusively via DATABASE_URL, so these are all optional.
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.preprocess(
    (val) => (val === undefined || val === '' ? 5432 : Number(val)),
    z.number().default(5432),
  ),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().optional().default(''),
  DB_NAME: z.string().default('moobase'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.preprocess((val) => Number(val), z.number().optional()),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
export default env;
