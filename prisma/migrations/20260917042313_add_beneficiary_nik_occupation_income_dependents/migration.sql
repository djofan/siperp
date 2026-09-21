-- AlterTable
ALTER TABLE `lazsip_beneficiaries` ADD COLUMN `dependents_count` INTEGER NULL,
    ADD COLUMN `dependents_detail` TEXT NULL,
    ADD COLUMN `monthly_income` INTEGER NULL,
    ADD COLUMN `nik` VARCHAR(191) NULL,
    ADD COLUMN `occupation` VARCHAR(191) NULL;
