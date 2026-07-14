import app from './app';
import { prisma } from './config/db';

async function runTests() {
  console.log('⚡ Starting MooBase API Verification Tests...');

  const PORT = 5999; // Test port
  const server = app.listen(PORT, async () => {
    console.log(`📡 Test server listening on http://localhost:${PORT}`);

    try {
      // 1. Verify GET /health-check
      const resHealth = await fetch(`http://localhost:${PORT}/health-check`);
      const dataHealth = (await resHealth.json()) as any;
      console.log('👉 Test 1: GET /health-check');
      console.log(`   Response status: ${resHealth.status}`);
      if (resHealth.status !== 200 || dataHealth.status !== 'ok') {
        throw new Error(`Health check failed! status=${resHealth.status}, body=${JSON.stringify(dataHealth)}`);
      }
      console.log('   ✅ Health check endpoint passed!');

      // 2. Verify validation middleware on POST /api/auth/login
      const resLogin = await fetch(`http://localhost:${PORT}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const dataLogin = (await resLogin.json()) as any;
      console.log('👉 Test 2: Validation on POST /api/auth/login');
      console.log(`   Response status: ${resLogin.status}`);
      if (resLogin.status !== 400 || dataLogin.message !== 'Validation Error') {
        throw new Error(`Auth validation failed! status=${resLogin.status}, body=${JSON.stringify(dataLogin)}`);
      }
      console.log('   ✅ Auth Zod validation checks passed!');

      console.log('\n🎉 All API verification tests passed successfully!');
      cleanup(0);
    } catch (error: any) {
      console.error('\n❌ API Verification failed:', error.message);
      cleanup(1);
    }
  });

  function cleanup(code: number) {
    server.close(async () => {
      await prisma.$disconnect();
      console.log('🔌 Database disconnected. Exiting tests with code:', code);
      process.exit(code);
    });
  }
}

runTests();
