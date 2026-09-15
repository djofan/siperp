-- AlterTable
ALTER TABLE `lazsip_zakat_payments` ADD COLUMN `jiwa_count` INTEGER NULL,
    ADD COLUMN `zakat_type` VARCHAR(191) NOT NULL DEFAULT 'maal',
    MODIFY `gold_price_snapshot` INTEGER NULL;
