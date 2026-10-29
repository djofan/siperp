-- sip_laporan.description & .image ditambahkan di migration sebelumnya tapi tidak pernah
-- dipakai di form/halaman manapun (fitur Laporan cuma link/file PDF) — dihapus lagi.

-- AlterTable
ALTER TABLE `sip_laporan`
    DROP COLUMN `description`,
    DROP COLUMN `image`;
