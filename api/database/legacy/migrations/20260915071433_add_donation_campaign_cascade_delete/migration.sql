-- DropForeignKey
ALTER TABLE `lazsip_donations` DROP FOREIGN KEY `lazsip_donations_campaign_id_fkey`;

-- DropIndex
DROP INDEX `lazsip_donations_campaign_id_fkey` ON `lazsip_donations`;

-- AddForeignKey
ALTER TABLE `lazsip_donations` ADD CONSTRAINT `lazsip_donations_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `lazsip_campaigns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
