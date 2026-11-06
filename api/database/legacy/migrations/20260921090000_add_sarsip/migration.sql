CREATE TABLE `sarsip_entries` (
  `id` VARCHAR(191) NOT NULL,
  `kind` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NOT NULL,
  `location` VARCHAR(191) NULL,
  `event_date` DATETIME(3) NULL,
  `image` VARCHAR(191) NULL,
  `target_amount` INTEGER NOT NULL DEFAULT 0,
  `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `sarsip_entries_kind_status_created_at_idx` (`kind`, `status`, `created_at`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `sarsip_profiles` (
  `id` VARCHAR(191) NOT NULL DEFAULT 'main',
  `headline` VARCHAR(191) NOT NULL,
  `description` TEXT NOT NULL,
  `contact` VARCHAR(191) NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `sarsip_payment_methods` (
  `id` VARCHAR(191) NOT NULL,
  `method` VARCHAR(191) NOT NULL,
  `fee_amount` INTEGER NULL,
  `fee_percentage` DOUBLE NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `sarsip_payment_methods_method_key` (`method`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

