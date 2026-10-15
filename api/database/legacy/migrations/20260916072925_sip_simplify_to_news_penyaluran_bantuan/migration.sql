-- SIP module cleanup: hapus tabel yang tidak dipakai section homepage (Pengurus, Kegiatan
-- Terkini lama, Mitra), rename Blog -> News (Berita), tambah tabel Penyaluran Bantuan.

-- DropTable
DROP TABLE `sip_pengurus`;

-- DropTable
DROP TABLE `sip_kegiatan_terkini`;

-- DropTable
DROP TABLE `sip_mitra`;

-- RenameTable
RENAME TABLE `sip_blog` TO `sip_news`;

-- AlterTable
ALTER TABLE `sip_laporan`
    ADD COLUMN `description` TEXT NOT NULL,
    ADD COLUMN `image` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `sip_penyaluran_bantuan` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `image` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `date` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
