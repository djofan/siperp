-- AlterTable: add tracking_code as nullable first so existing rows can be backfilled
ALTER TABLE `payment_transactions` ADD COLUMN `tracking_code` VARCHAR(191) NULL;

-- Backfill existing rows with a deterministic code derived from their id
UPDATE `payment_transactions` SET `tracking_code` = CONCAT('LZS-', UPPER(SUBSTRING(id, 1, 6))) WHERE `tracking_code` IS NULL;

-- Now enforce NOT NULL + UNIQUE
ALTER TABLE `payment_transactions` MODIFY COLUMN `tracking_code` VARCHAR(191) NOT NULL;
ALTER TABLE `payment_transactions` ADD UNIQUE INDEX `payment_transactions_tracking_code_key`(`tracking_code`);

-- AlterTable: donor email must be unique (nullable — validated at the application layer
-- that phone and email are not both null)
ALTER TABLE `payment_donors` ADD UNIQUE INDEX `payment_donors_email_key`(`email`);
