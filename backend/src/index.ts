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

async function ensureInitialCattleAndRecords() {
  try {
    const cattleCount = await prisma.cattle.count();
    if (cattleCount === 0) {
      console.log('🌱 Seeding initial Kayera Farm cattle and records into database...');

      const cattleData = [
        {
          id: 'C001',
          tagNumber: 'TAG-001',
          name: 'Bella',
          breed: 'Friesian',
          age: 3,
          gender: 'female',
          status: 'healthy' as const,
        },
        {
          id: 'C002',
          tagNumber: 'TAG-002',
          name: 'Daisy',
          breed: 'Jersey',
          age: 4,
          gender: 'female',
          status: 'lactating' as const,
        },
        {
          id: 'C003',
          tagNumber: 'TAG-003',
          name: 'Rose',
          breed: 'Ankole',
          age: 2,
          gender: 'female',
          status: 'healthy' as const,
        },
        {
          id: 'C004',
          tagNumber: 'TAG-004',
          name: 'Luna',
          breed: 'Friesian',
          age: 5,
          gender: 'female',
          status: 'vaccinated' as const,
        },
        {
          id: 'C005',
          tagNumber: 'TAG-005',
          name: 'Molly',
          breed: 'Crossbreed',
          age: 3,
          gender: 'female',
          status: 'sick' as const,
        },
        {
          id: 'C006',
          tagNumber: 'TAG-006',
          name: 'Bruno',
          breed: 'Boran Bull',
          age: 4,
          gender: 'male',
          status: 'healthy' as const,
        },
      ];

      for (const item of cattleData) {
        await prisma.cattle.upsert({
          where: { id: item.id },
          update: {},
          create: item,
        });
      }

      const now = new Date();

      await prisma.vaccinationRecord.upsert({
        where: { id: 'R001' },
        update: {},
        create: {
          id: 'R001',
          cattleId: 'C001',
          vaccineName: 'Foot and Mouth Disease',
          dateAdministered: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          nextDueDate: new Date(now.getTime() + 173 * 24 * 60 * 60 * 1000),
        },
      });

      await prisma.milkProduction.upsert({
        where: { id: 'R002' },
        update: {},
        create: {
          id: 'R002',
          cattleId: 'C002',
          quantity: 12.0,
          date: now,
        },
      });

      await prisma.healthRecord.upsert({
        where: { id: 'R003' },
        update: {},
        create: {
          id: 'R003',
          cattleId: 'C005',
          description: 'Showing signs of fever, isolated from herd',
          treatment: 'Antipyretics, isolation',
          vetName: 'Dr. Mukasa',
          date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        },
      });

      console.log('✅ Initial Kayera Farm cattle and records seeded successfully.');
    }
  } catch (err: any) {
    console.warn('⚠️ Non-fatal error during cattle seed check:', err?.message || err);
  }
}

const server = app.listen(env.PORT, '0.0.0.0', async () => {
  console.log(`🚀 MooBase Server running in ${env.NODE_ENV} mode on http://0.0.0.0:${env.PORT}`);
  await ensureDefaultUsers();
  await ensureInitialCattleAndRecords();
});

process.on('unhandledRejection', (err: any) => {
  console.log('❌ UNHANDLED REJECTION! 💥 Shutting down server...');
  console.log(err?.name, err?.message);
  server.close(() => {
    process.exit(1);
  });
});
export default server;
