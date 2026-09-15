-- CreateTable
CREATE TABLE `lazsip_beneficiaries` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `address` TEXT NOT NULL,
    `problem_faced` TEXT NOT NULL,
    `birth_date` DATETIME(3) NOT NULL,
    `age` INTEGER NOT NULL,
    `gender` VARCHAR(191) NOT NULL,
    `referral_source` VARCHAR(191) NOT NULL,
    `photo` VARCHAR(191) NULL,
    `needs` TEXT NOT NULL,
    `aid_type` VARCHAR(191) NOT NULL,
    `amount_received` INTEGER NOT NULL,
    `verifier_name` VARCHAR(191) NOT NULL,
    `verifier_area` VARCHAR(191) NOT NULL,
    `marital_status` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
