import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await hash("password123", 10);

  const manager = await prisma.user.upsert({
    where: { email: "manager@rc-gestion.local" },
    update: {},
    create: {
      email: "manager@rc-gestion.local",
      name: "Marie Manager",
      passwordHash,
      role: "MANAGER",
      active: true,
    },
  });

  const employee1 = await prisma.user.upsert({
    where: { email: "employe1@rc-gestion.local" },
    update: {},
    create: {
      email: "employe1@rc-gestion.local",
      name: "Jean Dupont",
      passwordHash,
      role: "EMPLOYEE",
      active: true,
    },
  });

  const employee2 = await prisma.user.upsert({
    where: { email: "employe2@rc-gestion.local" },
    update: {},
    create: {
      email: "employe2@rc-gestion.local",
      name: "Sophie Martin",
      passwordHash,
      role: "EMPLOYEE",
      active: true,
    },
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(11, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(15, 0, 0, 0);

  let slot = await prisma.shiftSlot.findFirst({
    where: { name: "Midi", startsAt: tomorrow },
  });

  if (!slot) {
    slot = await prisma.shiftSlot.create({
      data: {
        name: "Midi",
        startsAt: tomorrow,
        endsAt: tomorrowEnd,
        notes: "Service midi",
      },
    });
  }

  const existingAssignment = await prisma.shift.findFirst({
    where: { userId: employee1.id, slotId: slot.id },
  });

  if (!existingAssignment) {
    await prisma.shift.create({
      data: {
        slotId: slot.id,
        userId: employee1.id,
        startsAt: tomorrow,
        endsAt: tomorrowEnd,
      },
    });
  }

  console.log("Seed OK");
  console.log("Manager:", manager.email, "/ password123");
  console.log("Employé 1:", employee1.email, "/ password123");
  console.log("Employé 2:", employee2.email, "/ password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
