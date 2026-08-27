import app from './app';
import { env } from './config/env';
import { prisma } from './config/db';
import bcrypt from 'bcryptjs';

async function ensureDefaultUsers() {
  try {
    const defaultUsers = [
      {
        email: 'manager@moobase.com',
        name: 'Kabaka Ronald',
        role: 'manager' as const,
        phone: '+256700000001',
      },
      {
        email: 'admin@moobase.com',
        name: 'Farm Manager',
        role: 'manager' as const,
        phone: '+256700000000',
      },
      {
        email: 'attendant@moobase.com',
        name: 'Attendant User',
        role: 'attendant' as const,
        phone: '+256700000002',
      },
      {
        email: 'attendant1@moobase.com',
        name: 'Mukasa John',
        role: 'attendant' as const,
        phone: '+256700000003',
      },
      {
        email: 'attendant2@moobase.com',
        name: 'Nalule Sarah',
        role: 'attendant' as const,
        phone: '+256700000004',
      },
    ];

    for (const u of defaultUsers) {
      const existingUser = await prisma.user.findUnique({ where: { email: u.email } });
      if (!existingUser) {
        await prisma.user.create({
          data: {
            ...u,
            passwordHash: await bcrypt.hash('Password123', 10),
          },
        });
      }
    }
    console.log('✅ Default users verified and seeded');
  } catch (err: any) {
    console.warn('⚠️ Non-fatal: Could not verify/seed default users at boot:', err?.message || err);
  }
}

const server = app.listen(env.PORT, async () => {
  console.log(`🚀 MooBase Server running in ${env.NODE_ENV} mode on http://localhost:${env.PORT}`);
  await ensureDefaultUsers();
});

process.on('unhandledRejection', (err: any) => {
  console.log('❌ UNHANDLED REJECTION! 💥 Shutting down server...');
  console.log(err?.name, err?.message);
  server.close(() => {
    process.exit(1);
  });
});
export default server;
