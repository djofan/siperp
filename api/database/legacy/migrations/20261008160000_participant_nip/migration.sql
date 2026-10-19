ALTER TABLE `zakat_academy_profiles` ADD COLUMN `address` TEXT NULL;
CREATE TABLE `teknisi_participants` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `nip` VARCHAR(191) NOT NULL,
  `address` TEXT NOT NULL,
  `phone` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `teknisi_participants_userId_key` (`userId`),
  UNIQUE INDEX `teknisi_participants_nip_key` (`nip`),
  UNIQUE INDEX `teknisi_participants_phone_key` (`phone`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `teknisi_participants` ADD CONSTRAINT `teknisi_participants_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `teknisi_tickets` ADD COLUMN `participantId` VARCHAR(191) NULL;
CREATE INDEX `teknisi_tickets_participantId_idx` ON `teknisi_tickets` (`participantId`);
ALTER TABLE `teknisi_tickets` ADD CONSTRAINT `teknisi_tickets_participantId_fkey` FOREIGN KEY (`participantId`) REFERENCES `teknisi_participants` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
-- Profil lama tetap memakai password sebelumnya; NIP ditambahkan hanya jika belum ada.
UPDATE `zakat_academy_profiles` SET `nis` = CONCAT('AC', UPPER(SUBSTRING(SHA2(`id`, 256), 1, 12))) WHERE `nis` IS NULL;
