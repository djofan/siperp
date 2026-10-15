CREATE TABLE `sarsip_beneficiaries` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(191) NULL,
  `location` VARCHAR(191) NOT NULL,
  `assistance` VARCHAR(191) NOT NULL,
  `received_at` DATETIME(3) NOT NULL,
  `notes` TEXT NULL,
  `archived_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `sarsip_beneficiaries_archived_at_created_at_idx` (`archived_at`, `created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
