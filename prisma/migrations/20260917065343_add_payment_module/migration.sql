-- CreateTable
CREATE TABLE `payment_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `module_source` VARCHAR(191) NOT NULL,
    `source_type` VARCHAR(191) NOT NULL,
    `source_id` VARCHAR(191) NOT NULL,
    `fund_type` VARCHAR(191) NOT NULL,
    `donor_name` VARCHAR(191) NOT NULL,
    `is_anonymous` BOOLEAN NOT NULL DEFAULT false,
    `amount` INTEGER NOT NULL,
    `admin_fee` INTEGER NOT NULL DEFAULT 0,
    `payment_method` VARCHAR(191) NOT NULL,
    `destination_account_id` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `midtrans_order_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `paid_at` DATETIME(3) NULL,

    UNIQUE INDEX `payment_transactions_midtrans_order_id_key`(`midtrans_order_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_destination_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `module_source` VARCHAR(191) NOT NULL,
    `fund_type` VARCHAR(191) NOT NULL,
    `bank_name` VARCHAR(191) NOT NULL,
    `account_number` VARCHAR(191) NOT NULL,
    `account_name` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `payment_transactions` ADD CONSTRAINT `payment_transactions_destination_account_id_fkey` FOREIGN KEY (`destination_account_id`) REFERENCES `payment_destination_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
