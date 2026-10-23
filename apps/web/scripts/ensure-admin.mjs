import { PrismaClient } from "@prisma/client";

const username = process.env.ADMIN_USERNAME?.trim();
if (!username) {
  throw new Error("ADMIN_USERNAME must be configured before starting the Liara Agent.");
}

const prisma = new PrismaClient();
try {
  await prisma.user.upsert({
    where: { username },
    update: {},
    create: { username, passwordHash: "managed-by-env" },
  });
} finally {
  await prisma.$disconnect();
}
