CREATE TABLE `lazsip_history_otp` (
  `email_key` VARCHAR(191) NOT NULL,
  `challenge_id` VARCHAR(191) NULL,
  `code_hash` VARCHAR(191) NULL,
  `expires_at` DATETIME(3) NULL,
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `send_count` INTEGER NOT NULL DEFAULT 0,
  `sent_at` DATETIME(3) NULL,
  `window_start` DATETIME(3) NULL,
  PRIMARY KEY (`email_key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
