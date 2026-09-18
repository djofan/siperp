-- Preserve every existing identity before removing duplicated name columns.
-- Old transactions have no phone: do not merge people merely by name.
CREATE TABLE `payment_donors` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `payment_donors_phone_key` (`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `payment_transactions` ADD COLUMN `donor_id` VARCHAR(191) NULL;
ALTER TABLE `lazsip_donations` ADD COLUMN `donor_id` VARCHAR(191) NULL;
ALTER TABLE `lazsip_zakat_payments` ADD COLUMN `donor_id` VARCHAR(191) NULL;

INSERT INTO `payment_donors` (`id`, `name`, `created_at`)
SELECT CONCAT('payment_', `id`), `donor_name`, `created_at` FROM `payment_transactions`;
INSERT INTO `payment_donors` (`id`, `name`, `created_at`)
SELECT CONCAT('donation_', `id`), `donor_name`, `created_at` FROM `lazsip_donations`;
INSERT INTO `payment_donors` (`id`, `name`, `created_at`)
SELECT CONCAT('zakat_', `id`), `donor_name`, `created_at` FROM `lazsip_zakat_payments`;

UPDATE `payment_transactions` SET `donor_id` = CONCAT('payment_', `id`);
UPDATE `lazsip_donations` SET `donor_id` = CONCAT('donation_', `id`);
UPDATE `lazsip_zakat_payments` SET `donor_id` = CONCAT('zakat_', `id`);

ALTER TABLE `payment_transactions` MODIFY `donor_id` VARCHAR(191) NOT NULL, DROP COLUMN `donor_name`;
ALTER TABLE `lazsip_donations` MODIFY `donor_id` VARCHAR(191) NOT NULL, DROP COLUMN `donor_name`;
ALTER TABLE `lazsip_zakat_payments` MODIFY `donor_id` VARCHAR(191) NOT NULL, DROP COLUMN `donor_name`;

ALTER TABLE `payment_transactions` ADD CONSTRAINT `payment_transactions_donor_id_fkey` FOREIGN KEY (`donor_id`) REFERENCES `payment_donors` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `lazsip_donations` ADD CONSTRAINT `lazsip_donations_donor_id_fkey` FOREIGN KEY (`donor_id`) REFERENCES `payment_donors` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `lazsip_zakat_payments` ADD CONSTRAINT `lazsip_zakat_payments_donor_id_fkey` FOREIGN KEY (`donor_id`) REFERENCES `payment_donors` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX `payment_campaign_status_idx` ON `payment_transactions` (`module_source`, `source_type`, `source_id`, `status`);
