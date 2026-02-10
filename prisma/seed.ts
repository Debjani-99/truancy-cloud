import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  // Seed county
  const champaign = await prisma.county.upsert({
    where: { name: "Champaign County" },
    update: {},
    create: { name: "Champaign County" },
  });

  // Seed schools
  const urbana = await prisma.school.upsert({
    where: {
      countyId_name: { countyId: champaign.id, name: "Urbana High School" },
    },
    update: {},
    create: { name: "Urbana High School", countyId: champaign.id },
  });

  const graham = await prisma.school.upsert({
    where: {
      countyId_name: { countyId: champaign.id, name: "Graham High School" },
    },
    update: {},
    create: { name: "Graham High School", countyId: champaign.id },
  });

  // Seed admin user
  await prisma.user.upsert({
    where: { email: "admin@secondbell.dev" },
    update: {},
    create: {
      firstName: "Admin",
      lastName: "User",
      email: "admin@secondbell.dev",
      passwordHash,
      role: "ADMIN",
    },
  });

  // Seed court user (scoped to Champaign County)
  await prisma.user.upsert({
    where: { email: "court@secondbell.dev" },
    update: {},
    create: {
      firstName: "Court",
      lastName: "Staff",
      email: "court@secondbell.dev",
      passwordHash,
      role: "COURT",
      countyId: champaign.id,
    },
  });

  // Seed school user (scoped to Urbana High School)
  await prisma.user.upsert({
    where: { email: "urbana_school@secondbell.dev" },
    update: {},
    create: {
      firstName: "Urbana High School",
      lastName: "Admin",
      email: "urbana_school@secondbell.dev",
      passwordHash,
      role: "SCHOOL",
      schoolId: urbana.id,
    },
  });

  // Seed school user (scoped to Graham High School)
  await prisma.user.upsert({
    where: { email: "graham_school@secondbell.dev" },
    update: {},
    create: {
      firstName: "Graham High School",
      lastName: "Admin",
      email: "graham_school@secondbell.dev",
      passwordHash,
      role: "SCHOOL",
      schoolId: graham.id,
    },
  });

  console.log("Seed complete:");
  console.log("  County: Champaign County");
  console.log("  Schools: Urbana High School, Graham High School");
  console.log(
    "  Users: admin@secondbell.dev, court@secondbell.dev, urbana_school@secondbell.dev, graham_school@secondbell.dev"
  );
  console.log("  Password for all: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
