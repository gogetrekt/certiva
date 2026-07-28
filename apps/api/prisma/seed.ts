import { AdminRole, IssuerStatus, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';

const prisma = new PrismaClient();

/**
 * No static default. A hardcoded seed password is published wherever the
 * runbook is, and the gap between `prisma db seed` and someone remembering to
 * change it is a real window on an internet-facing host. Set
 * SEED_ADMIN_PASSWORD to choose one; otherwise a random one is generated and
 * printed here, once.
 */
function resolveAdminPassword() {
  const fromEnv = process.env.SEED_ADMIN_PASSWORD;
  if (fromEnv) {
    return { password: fromEnv, generated: false };
  }

  return { password: randomBytes(16).toString('base64url'), generated: true };
}

async function main() {
  const { password, generated } = resolveAdminPassword();
  const passwordHash = await bcrypt.hash(password, 12);

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

  if (generated) {
    console.log(
      `Generated admin password for "admin": ${password}\n` +
        'This is printed once and not stored anywhere else. Set ' +
        'SEED_ADMIN_PASSWORD to choose it yourself.',
    );
  } else {
    console.log('Admin password taken from SEED_ADMIN_PASSWORD.');
  }
}

main()
  .catch((error) => {
    console.error('Seeding failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
