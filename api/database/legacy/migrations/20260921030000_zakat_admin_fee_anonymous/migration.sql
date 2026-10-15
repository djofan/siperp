-- AlterTable
ALTER TABLE `lazsip_zakat_payments` ADD COLUMN `admin_fee` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `lazsip_zakat_payments` ADD COLUMN `covers_fee` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `lazsip_zakat_payments` ADD COLUMN `is_anonymous` BOOLEAN NOT NULL DEFAULT false;
