-- Repair databases whose older SIP migration history omitted this table.
-- Existing installations already have it from the SIP cleanup migration.
-- Preserve all existing SIP tables and records.
CREATE TABLE IF NOT EXISTS `sip_penyaluran_bantuan` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `image` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `date` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
