-- CreateTable
CREATE TABLE `lazsip_campaigns` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `target_amount` INTEGER NOT NULL,
    `current_amount` INTEGER NOT NULL DEFAULT 0,
    `image` VARCHAR(191) NULL,
    `unique_code` VARCHAR(191) NOT NULL,
    `is_pinned` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `lazsip_campaigns_unique_code_key`(`unique_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lazsip_donations` (
    `id` VARCHAR(191) NOT NULL,
    `campaign_id` VARCHAR(191) NOT NULL,
    `donor_name` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL,
    `admin_fee` INTEGER NOT NULL DEFAULT 0,
    `covers_fee` BOOLEAN NOT NULL DEFAULT true,
    `is_anonymous` BOOLEAN NOT NULL DEFAULT false,
    `payment_method` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lazsip_zakat_payments` (
    `id` VARCHAR(191) NOT NULL,
    `donor_name` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL,
    `gold_price_snapshot` INTEGER NOT NULL,
    `payment_method` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lazsip_payment_fee_refs` (
    `id` VARCHAR(191) NOT NULL,
    `method` VARCHAR(191) NOT NULL,
    `fee_amount` INTEGER NULL,
    `fee_percentage` DOUBLE NULL,

    UNIQUE INDEX `lazsip_payment_fee_refs_method_key`(`method`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `lazsip_donations` ADD CONSTRAINT `lazsip_donations_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `lazsip_campaigns`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
