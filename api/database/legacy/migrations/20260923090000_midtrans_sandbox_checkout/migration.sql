ALTER TABLE `payment_transactions`
 ADD COLUMN `gateway` VARCHAR(191) NOT NULL DEFAULT 'simulation',
 ADD COLUMN `gateway_state` VARCHAR(191) NOT NULL DEFAULT 'not_started',
 ADD COLUMN `gateway_merchant_id` VARCHAR(191) NULL,
 ADD COLUMN `gateway_checkout_url` TEXT NULL;
