/*
  Warnings:

  - You are about to drop the `sip_blog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sip_kegiatan_terkini` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sip_mitra` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sip_pengurus` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `description` to the `sip_laporan` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `sip_laporan` ADD COLUMN `description` TEXT NOT NULL,
    ADD COLUMN `image` VARCHAR(191) NULL;

-- DropTable
DROP TABLE `sip_blog`;

-- DropTable
DROP TABLE `sip_kegiatan_terkini`;

-- DropTable
DROP TABLE `sip_mitra`;

-- DropTable
DROP TABLE `sip_pengurus`;

-- CreateTable
CREATE TABLE `sip_news` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `image` VARCHAR(191) NULL,
    `is_pinned` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
