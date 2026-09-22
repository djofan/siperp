// Modul payment adalah hub-nya sendiri — tidak perlu mendaftarkan confirmation handler
// ke dirinya sendiri. File ini ada supaya import "@/modules/payment/api/wiring" di
// prisma/seed.ts tidak pernah gagal resolve, konsisten dengan pola wiring.ts modul lain
// (lazsip, sip).
export {};
