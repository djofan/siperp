-- CreateTable
CREATE TABLE `lazsip_campaign_adjustments` (
    `id` VARCHAR(191) NOT NULL,
    `campaign_id` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL,
    `note` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `lazsip_campaign_adjustments` ADD CONSTRAINT `lazsip_campaign_adjustments_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `lazsip_campaigns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
