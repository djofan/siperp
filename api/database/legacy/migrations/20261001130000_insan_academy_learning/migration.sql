ALTER TABLE `zakat_academy_profiles` ADD COLUMN `must_change_password` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `zakat_academy_courses`
  ADD COLUMN `teacher` VARCHAR(191) NOT NULL DEFAULT 'Ustadz Irham',
  ADD COLUMN `quota` INTEGER NOT NULL DEFAULT 200,
  ADD COLUMN `duration_days` INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN `starts_at` DATETIME(3) NULL,
  ADD COLUMN `is_simulation` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `zakat_academy_lessons`
  MODIFY COLUMN `video_provider` ENUM('AUDIO', 'YOUTUBE', 'VIMEO', 'BUNNY') NOT NULL,
  ADD COLUMN `release_day` INTEGER NOT NULL DEFAULT 1;
ALTER TABLE `zakat_academy_enrollments` ADD COLUMN `group_joined_at` DATETIME(3) NULL;
ALTER TABLE `zakat_academy_quizzes`
  ADD COLUMN `kind` ENUM('DAILY','WEEKLY','FINAL') NOT NULL DEFAULT 'DAILY',
  ADD COLUMN `closes_at` DATETIME(3) NULL;
ALTER TABLE `zakat_academy_quiz_questions`
  ADD COLUMN `type` ENUM('SINGLE','TRUE_FALSE','MULTIPLE') NOT NULL DEFAULT 'SINGLE',
  ADD COLUMN `weight` INTEGER NOT NULL DEFAULT 1;
CREATE TABLE `academy_study_notes` (
  `id` VARCHAR(191) NOT NULL, `profile_id` VARCHAR(191) NOT NULL, `lesson_id` VARCHAR(191) NOT NULL,
  `content` TEXT NOT NULL, `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`), UNIQUE INDEX `academy_study_notes_profile_id_lesson_id_key` (`profile_id`,`lesson_id`),
  CONSTRAINT `academy_study_notes_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `zakat_academy_profiles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `academy_study_notes_lesson_id_fkey` FOREIGN KEY (`lesson_id`) REFERENCES `zakat_academy_lessons` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `academy_live_sessions` (
  `id` VARCHAR(191) NOT NULL, `course_id` VARCHAR(191) NOT NULL, `title` VARCHAR(191) NOT NULL,
  `starts_at` DATETIME(3) NOT NULL, `join_url` TEXT NOT NULL, PRIMARY KEY (`id`),
  INDEX `academy_live_sessions_course_id_starts_at_idx` (`course_id`,`starts_at`),
  CONSTRAINT `academy_live_sessions_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `zakat_academy_courses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `academy_discussions` (
  `id` VARCHAR(191) NOT NULL, `course_id` VARCHAR(191) NOT NULL, `profile_id` VARCHAR(191) NOT NULL,
  `question` TEXT NOT NULL, `answer` TEXT NULL, `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `answered_at` DATETIME(3) NULL,
  PRIMARY KEY (`id`), INDEX `academy_discussions_course_id_created_at_idx` (`course_id`,`created_at`),
  CONSTRAINT `academy_discussions_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `zakat_academy_profiles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `academy_discussions_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `zakat_academy_courses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
