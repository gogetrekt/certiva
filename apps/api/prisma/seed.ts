import { AdminRole, IssuerStatus, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 12);

  const issuer = await prisma.issuer.upsert({
    where: {
      domain: 'certiva.local',
    },
    update: {
      name: 'Certiva Demo Issuer',
      displayName: 'Certiva Demo University',
      websiteUrl: 'https://certiva.local',
      wallet: '0x1111111111111111111111111111111111111111',
      status: IssuerStatus.ACTIVE,
    },
    create: {
      name: 'Certiva Demo Issuer',
      displayName: 'Certiva Demo University',
      domain: 'certiva.local',
      websiteUrl: 'https://certiva.local',
      wallet: '0x1111111111111111111111111111111111111111',
      status: IssuerStatus.ACTIVE,
    },
  });

  await prisma.admin.upsert({
    where: {
      email: 'admin@certiva.local',
    },
    update: {
      username: 'admin',
      password: passwordHash,
      role: AdminRole.SUPER_ADMIN,
      active: true,
      issuerId: issuer.id,
    },
    create: {
      username: 'admin',
      email: 'admin@certiva.local',
      password: passwordHash,
      role: AdminRole.SUPER_ADMIN,
      active: true,
      issuerId: issuer.id,
    },
  });
}

main()
  .catch((error) => {
    console.error('Seeding failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
