-- CreateTable
CREATE TABLE `lazsip_zakat_details` (
    `id` VARCHAR(191) NOT NULL,
    `zakat_type` VARCHAR(191) NOT NULL,
    `gold_price_snapshot` INTEGER NULL,
    `jiwa_count` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
