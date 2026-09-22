-- Restore category alongside type, without changing already-published migration history.
-- The earlier type migration dropped category. Recover previous values from a backup
-- before deploying if existing programs must retain their original categories.
ALTER TABLE `lazsip_programs` ADD COLUMN `category` VARCHAR(191) NOT NULL DEFAULT 'umum';
