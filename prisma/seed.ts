import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  // Seed counties
  const champaign = await prisma.county.upsert({
    where: { name: "Champaign County" },
    update: {},
    create: { name: "Champaign County" },
  });

  const clark = await prisma.county.upsert({
    where: { name: "Clark County" },
    update: {},
    create: { name: "Clark County" },
  });

  // Seed schools ( scopped: champaign county)
  const urbana = await prisma.school.upsert({
    where: {
      countyId_name: { countyId: champaign.id, name: "Urbana High School" },
    },
    update: {},
    create: {
      name: "Urbana High School",
      countyId: champaign.id,
    },
  });

  // ( scopped: champaign county)
  const graham = await prisma.school.upsert({
    where: {
      countyId_name: { countyId: champaign.id, name: "Graham High School" },
    },
    update: {},
    create: {
      name: "Graham High School",
      countyId: champaign.id,
    },
  });

  // ( scopped: clark county)
  const springfield = await prisma.school.upsert({
    where: {
      countyId_name: { countyId: clark.id, name: "Springfield High School" },
    },
    update: {},
    create: {
      name: "Springfield High School",
      countyId: clark.id,
    },
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

  // Seed court users
  await prisma.user.upsert({
    where: { email: "champaign_court@secondbell.dev" },
    update: {},
    create: {
      firstName: "Champaign",
      lastName: "Court",
      email: "champaign_court@secondbell.dev",
      passwordHash,
      role: "COURT",
      countyId: champaign.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "clark_court@secondbell.dev" },
    update: {},
    create: {
      firstName: "Clark",
      lastName: "Court",
      email: "clark_court@secondbell.dev",
      passwordHash,
      role: "COURT",
      countyId: clark.id,
    },
  });

  // Seed school users 
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

  await prisma.user.upsert({
    where: { email: "springfield_school@secondbell.dev" },
    update: {},
    create: {
      firstName: "Springfield High School",
      lastName: "Admin",
      email: "springfield_school@secondbell.dev",
      passwordHash,
      role: "SCHOOL",
      schoolId: springfield.id,
    },
  });

  console.log("Seed complete:");
  console.log("  Counties: Champaign County, Clark County");
  console.log(
    "  Schools: Urbana High School, Graham High School, Springfield High School"
  );
  console.log(
    "  Users: admin@secondbell.dev, champaign_court@secondbell.dev, clark_court@secondbell.dev, urbana_school@secondbell.dev, graham_school@secondbell.dev, springfield_school@secondbell.dev"
  );
  console.log("  Password for all users: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
