import request from 'supertest';
import app from './app';
import { prisma } from './config/db';

describe('MooBase API Integration Tests', () => {
  beforeAll(async () => {
    // Connect to database if necessary
  });

  afterAll(async () => {
    // Disconnect Prisma
    await prisma.$disconnect();
  });

  describe('GET /health-check', () => {
    it('should return 200 and status ok', async () => {
      const res = await request(app).get('/health-check');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          status: 'ok',
        })
      );
    });
  });

  describe('POST /api/auth/login validation', () => {
    it('should return 400 for empty login payload', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation Error');
      expect(res.body.errors).toBeDefined();
    });
  });

  describe('PATCH /api/auth/profile authentication', () => {
    it('should return 401 when no token is provided', async () => {
      const res = await request(app)
        .patch('/api/auth/profile')
        .send({ name: 'New Name' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/reports/summary authentication', () => {
    it('should return 401 when no token is provided', async () => {
      const res = await request(app)
        .get('/api/reports/summary');
      expect(res.status).toBe(401);
    });
  });
});
