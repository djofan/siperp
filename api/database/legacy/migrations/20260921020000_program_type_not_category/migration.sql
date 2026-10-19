-- AlterTable
ALTER TABLE `lazsip_programs` ADD COLUMN `type` VARCHAR(191) NOT NULL DEFAULT 'berita';
ALTER TABLE `lazsip_programs` ADD COLUMN `form_url` VARCHAR(191) NULL;
-- category remains part of LazsipProgram; preserve existing categories.
