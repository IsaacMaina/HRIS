import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting password update...');

  const newPassword = 'password123';
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const users = await prisma.user.findMany();

  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });
    console.log(`Updated password for user: ${user.email}`);
  }

  console.log('All user passwords have been updated to "password123".');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
