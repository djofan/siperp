-- AlterTable
ALTER TABLE `lazsip_programs` ADD COLUMN `type` VARCHAR(191) NOT NULL DEFAULT 'berita';
ALTER TABLE `lazsip_programs` ADD COLUMN `form_url` VARCHAR(191) NULL;
ALTER TABLE `lazsip_programs` DROP COLUMN `category`;
