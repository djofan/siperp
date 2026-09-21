import "dotenv/config";
import bcrypt from "bcryptjs";
import "@/modules/lazsip/api/wiring";
import "@/modules/sip/api/wiring";
import "@/modules/payment/api/wiring";
import { prisma } from "@/lib/prisma";
import { seedLazsipModuleRegistration } from "@/modules/lazsip/api/seed";
import { seedSipModuleRegistration } from "@/modules/sip/api/seed";
import { seedPaymentModuleRegistration } from "@/modules/payment/api/seed";
import { seedAcademyModuleRegistration } from "@/modules/academy/api/seed";
import { seedSarsipModuleRegistration } from "@/modules/sarsip/api/seed";

async function main() {
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;
  const name = process.env.SUPERADMIN_NAME ?? "Superadmin";

  if (!email || !password) {
    throw new Error(
      "SUPERADMIN_EMAIL dan SUPERADMIN_PASSWORD harus di-set di .env sebelum menjalankan seed."
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const superadmin = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, isSuperadmin: true, name },
    create: { email, passwordHash, isSuperadmin: true, name },
  });

  console.log(`Superadmin siap: ${superadmin.email}`);

  await seedLazsipModuleRegistration();
  console.log("Modul lazsip terdaftar.");

  await seedSipModuleRegistration();
  console.log("Modul sip terdaftar.");

  await seedPaymentModuleRegistration();  

  await seedAcademyModuleRegistration();
  await seedSarsipModuleRegistration();
  console.log("Modul academy terdaftar.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
