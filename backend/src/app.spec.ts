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

  describe('Authentication Security & Persistence End-to-End', () => {
    it('should reject unknown email with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent-user@example.com',
          password: 'randompassword',
        });
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid email/username or password');
    });

    it('should reject wrong password for existing user with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin@moobase.com',
          password: 'WrongPassword999!',
        });
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid email/username or password');
    });

    it('should reject mock tokens on protected endpoints with 401 Unauthorized', async () => {
      const res = await request(app)
        .get('/api/reports/summary')
        .set('Authorization', 'Bearer mock_token_arbitrary_12345');
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Unauthorized');
    });

    it('should authenticate valid credentials, persist profile name updates, and return persisted name on subsequent login', async () => {
      // 1. Login with valid credentials
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin@moobase.com',
          password: 'Password123',
        });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.accessToken).toBeDefined();
      expect(loginRes.body.user).toBeDefined();

      const token = loginRes.body.accessToken;
      const updatedName = 'Amos Farm Manager';

      // 2. Update profile name via self-service PATCH /api/auth/profile
      const patchRes = await request(app)
        .patch('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: updatedName,
          phone: '+256700000000',
        });
      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.user.name).toBe(updatedName);

      // 3. Simulate Device B / Fresh Login from another device
      const freshLoginRes = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin@moobase.com',
          password: 'Password123',
        });
      expect(freshLoginRes.status).toBe(200);
      // The persisted name in database MUST match across devices and logins
      expect(freshLoginRes.body.user.name).toBe(updatedName);
    });
  });
});
