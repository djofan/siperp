CREATE TABLE `participant_sequences` (
  `module_slug` VARCHAR(191) NOT NULL,
  `last_number` INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (`module_slug`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `zakat_academy_profiles` ADD COLUMN `deleted_at` DATETIME(3) NULL;
ALTER TABLE `teknisi_participants` ADD COLUMN `deleted_at` DATETIME(3) NULL;
ALTER TABLE `teknisi_technicians` ADD COLUMN `active_outlet_id` VARCHAR(191) NULL;
UPDATE `teknisi_technicians` SET `active_outlet_id` = `outletId` WHERE `isActive` = true;
CREATE UNIQUE INDEX `teknisi_technicians_active_outlet_id_key` ON `teknisi_technicians` (`active_outlet_id`);

INSERT INTO `participant_sequences` (`module_slug`, `last_number`)
SELECT 'academy', COALESCE(MAX(CAST(SUBSTRING(`nis`, 4) AS UNSIGNED)), 0) FROM `zakat_academy_profiles` WHERE `nis` REGEXP '^PAZ[0-9]{3,}$';
INSERT INTO `participant_sequences` (`module_slug`, `last_number`)
SELECT 'teknisi', COALESCE(MAX(CAST(SUBSTRING(`nip`, 4) AS UNSIGNED)), 0) FROM `teknisi_participants` WHERE `nip` REGEXP '^PTH[0-9]{2,}$';

CREATE TEMPORARY TABLE `_academy_nip_upgrade` AS
SELECT `id`, ROW_NUMBER() OVER (ORDER BY `created_at`, `id`) + (SELECT `last_number` FROM `participant_sequences` WHERE `module_slug` = 'academy') AS `number`
FROM `zakat_academy_profiles` WHERE `nis` IS NULL OR `nis` NOT REGEXP '^PAZ[0-9]{3,}$';
UPDATE `zakat_academy_profiles` p JOIN `_academy_nip_upgrade` n ON n.`id` = p.`id`
SET p.`nis` = CONCAT('PAZ', LPAD(n.`number`, GREATEST(3, CHAR_LENGTH(n.`number`)), '0'));
DROP TEMPORARY TABLE `_academy_nip_upgrade`;

CREATE TEMPORARY TABLE `_teknisi_nip_upgrade` AS
SELECT `id`, ROW_NUMBER() OVER (ORDER BY `createdAt`, `id`) + (SELECT `last_number` FROM `participant_sequences` WHERE `module_slug` = 'teknisi') AS `number`
FROM `teknisi_participants` WHERE `nip` NOT REGEXP '^PTH[0-9]{2,}$';
UPDATE `teknisi_participants` p JOIN `_teknisi_nip_upgrade` n ON n.`id` = p.`id`
SET p.`nip` = CONCAT('PTH', LPAD(n.`number`, GREATEST(2, CHAR_LENGTH(n.`number`)), '0'));
DROP TEMPORARY TABLE `_teknisi_nip_upgrade`;

UPDATE `participant_sequences` SET `last_number` = (SELECT COALESCE(MAX(CAST(SUBSTRING(`nis`, 4) AS UNSIGNED)), 0) FROM `zakat_academy_profiles`) WHERE `module_slug` = 'academy';
UPDATE `participant_sequences` SET `last_number` = (SELECT COALESCE(MAX(CAST(SUBSTRING(`nip`, 4) AS UNSIGNED)), 0) FROM `teknisi_participants`) WHERE `module_slug` = 'teknisi';
