import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create default users
  const passwordHash = await bcrypt.hash('Password123', 10);

  const manager = await prisma.user.upsert({
    where: { email: 'admin@moobase.com' },
    update: {},
    create: {
      email: 'admin@moobase.com',
      name: 'Farm Manager',
      passwordHash,
      role: 'manager',
    },
  });

  const attendant = await prisma.user.upsert({
    where: { email: 'attendant@moobase.com' },
    update: {},
    create: {
      email: 'attendant@moobase.com',
      name: 'Attendant User',
      passwordHash,
      role: 'attendant',
    },
  });

  console.log(`👤 Seeded users:\n  - Manager: ${manager.email} (pass: Password123)\n  - Attendant: ${attendant.email} (pass: Password123)`);

  // 2. Seed default Cattle matching frontend mock data
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
  ];

  for (const item of cattleData) {
    await prisma.cattle.upsert({
      where: { id: item.id },
      update: {},
      create: item,
    });
  }
  console.log('🐄 Seeded mock cattle');

  // Seed sample records
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

  console.log('📋 Seeded sample records');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
