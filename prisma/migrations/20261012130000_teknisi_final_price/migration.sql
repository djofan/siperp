-- Preserve the exact previous total bill while removing inventory from the active application.
-- Legacy inventory tables remain archival only; no customer or financial records are dropped.
UPDATE `teknisi_tickets` t
LEFT JOIN (
 SELECT `ticketId`, SUM((`quantity` - `returnedQuantity`) * `unitPrice`) AS total
 FROM `teknisi_part_uses` GROUP BY `ticketId`
) legacy ON legacy.`ticketId` = t.`id`
SET t.`serviceCost` = t.`serviceCost` + COALESCE(legacy.total, 0);
UPDATE `teknisi_tickets` SET `status` = 'paused' WHERE `status` = 'waiting_parts';
UPDATE `teknisi_events` SET `status` = 'paused' WHERE `status` = 'waiting_parts';
UPDATE `modules` SET `description` = 'Pengelolaan outlet, servis HP, akun PTH, pembayaran, dan monitoring.' WHERE `slug` = 'teknisi';
