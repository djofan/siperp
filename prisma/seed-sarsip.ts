import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { seedSarsipSimulation } from "@/modules/sarsip/api/seed";
seedSarsipSimulation()
  .then(() => console.log("Modul SARSIP dan metode simulasi siap."))
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());

