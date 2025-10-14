import 'dotenv/config';              // penting kalau pakai tsx langsung
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_DEFAULT_EMAIL || 'admin@local';
  const pwd   = process.env.ADMIN_DEFAULT_PASSWORD || 'ChangeMe123!';
  const hash  = await bcrypt.hash(pwd, 10);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, password: hash, role: 'admin' }
  });

  await prisma.deviceGroup.upsert({
    where: { name: 'Default' },
    update: {},
    create: { name: 'Default' }
  });

  console.log('✅ Seed complete. Admin:', email);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
