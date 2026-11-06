ALTER TABLE zakat_academy_courses ADD COLUMN registration_open BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE zakat_academy_lesson_progress ADD COLUMN audio_position DOUBLE NOT NULL DEFAULT 0, ADD COLUMN audio_source TEXT NULL;
ALTER TABLE zakat_academy_quiz_questions ADD COLUMN explanation TEXT NULL;
CREATE TABLE academy_notification_reads (
 id VARCHAR(191) NOT NULL, profile_id VARCHAR(191) NOT NULL, `key` VARCHAR(191) NOT NULL,
 read_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 PRIMARY KEY (id), UNIQUE INDEX academy_notification_reads_profile_id_key_key(profile_id,`key`),
 CONSTRAINT academy_notification_reads_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES zakat_academy_profiles(id) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
