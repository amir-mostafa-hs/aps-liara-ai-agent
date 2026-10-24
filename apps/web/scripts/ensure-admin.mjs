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

  const demoUsername = process.env.DEMO_USERNAME?.trim();
  const demoPassword = process.env.DEMO_PASSWORD;
  if (Boolean(demoUsername) !== Boolean(demoPassword)) {
    throw new Error("DEMO_USERNAME and DEMO_PASSWORD must both be configured or both be empty.");
  }
  if (demoUsername && demoPassword) {
    if (demoUsername === username) {
      throw new Error("DEMO_USERNAME must be different from ADMIN_USERNAME.");
    }
    const existingDemo = await prisma.user.findUnique({ where: { username: demoUsername } });
    if (existingDemo?.liaraToken || existingDemo?.liaraTeamId) {
      throw new Error("The configured demo account already has Liara credentials; refusing to reuse it.");
    }
    await prisma.user.upsert({
      where: { username: demoUsername },
      update: {},
      create: { username: demoUsername, passwordHash: "managed-by-env", liaraToken: null, liaraTeamId: null },
    });
  }
} finally {
  await prisma.$disconnect();
}
