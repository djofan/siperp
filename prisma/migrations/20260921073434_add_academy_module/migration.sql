-- CreateTable
CREATE TABLE `zakat_academy_profiles` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `nis` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `gender` ENUM('IKHWAN', 'AKHWAT') NULL,
    `image` TEXT NULL,
    `legacy_certificate_url` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `zakat_academy_profiles_user_id_key`(`user_id`),
    UNIQUE INDEX `zakat_academy_profiles_nis_key`(`nis`),
    UNIQUE INDEX `zakat_academy_profiles_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `zakat_academy_courses` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `short_description` TEXT NOT NULL,
    `description` TEXT NULL,
    `thumbnail_url` TEXT NULL,
    `material_url` TEXT NULL,
    `is_published` BOOLEAN NOT NULL DEFAULT false,
    `order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `zakat_academy_courses_slug_key`(`slug`),
    INDEX `zakat_academy_courses_is_published_order_idx`(`is_published`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `zakat_academy_chapters` (
    `id` VARCHAR(191) NOT NULL,
    `course_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `is_published` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `zakat_academy_chapters_course_id_is_published_order_idx`(`course_id`, `is_published`, `order`),
    UNIQUE INDEX `zakat_academy_chapters_course_id_slug_key`(`course_id`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `zakat_academy_lessons` (
    `id` VARCHAR(191) NOT NULL,
    `chapter_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `short_description` TEXT NULL,
    `content_summary` TEXT NULL,
    `thumbnail_url` TEXT NULL,
    `video_provider` ENUM('YOUTUBE', 'VIMEO', 'BUNNY') NOT NULL,
    `video_url` TEXT NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `is_published` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `zakat_academy_lessons_slug_key`(`slug`),
    INDEX `zakat_academy_lessons_chapter_id_is_published_order_idx`(`chapter_id`, `is_published`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `zakat_academy_lesson_attachments` (
    `id` VARCHAR(191) NOT NULL,
    `lesson_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `file_url` TEXT NOT NULL,
    `file_type` VARCHAR(191) NULL,
    `file_size` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `zakat_academy_lesson_attachments_lesson_id_idx`(`lesson_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `zakat_academy_enrollments` (
    `id` VARCHAR(191) NOT NULL,
    `profile_id` VARCHAR(191) NOT NULL,
    `course_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `zakat_academy_enrollments_course_id_idx`(`course_id`),
    UNIQUE INDEX `zakat_academy_enrollments_profile_id_course_id_key`(`profile_id`, `course_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `zakat_academy_lesson_progress` (
    `id` VARCHAR(191) NOT NULL,
    `profile_id` VARCHAR(191) NOT NULL,
    `lesson_id` VARCHAR(191) NOT NULL,
    `completed` BOOLEAN NOT NULL DEFAULT false,
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `zakat_academy_lesson_progress_lesson_id_idx`(`lesson_id`),
    UNIQUE INDEX `zakat_academy_lesson_progress_profile_id_lesson_id_key`(`profile_id`, `lesson_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `zakat_academy_quizzes` (
    `id` VARCHAR(191) NOT NULL,
    `chapter_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `passing_score` INTEGER NOT NULL DEFAULT 70,
    `is_published` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT false,
    `quiz_date` DATETIME(3) NULL,
    `time_limit_minutes` INTEGER NOT NULL DEFAULT 10,
    `allow_retake` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `zakat_academy_quizzes_chapter_id_idx`(`chapter_id`),
    INDEX `zakat_academy_quizzes_is_published_is_active_quiz_date_idx`(`is_published`, `is_active`, `quiz_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `zakat_academy_quiz_questions` (
    `id` VARCHAR(191) NOT NULL,
    `quiz_id` VARCHAR(191) NOT NULL,
    `question` TEXT NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `zakat_academy_quiz_questions_quiz_id_order_idx`(`quiz_id`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `zakat_academy_quiz_options` (
    `id` VARCHAR(191) NOT NULL,
    `question_id` VARCHAR(191) NOT NULL,
    `label` TEXT NOT NULL,
    `is_correct` BOOLEAN NOT NULL DEFAULT false,

    INDEX `zakat_academy_quiz_options_question_id_idx`(`question_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `zakat_academy_quiz_attempts` (
    `id` VARCHAR(191) NOT NULL,
    `profile_id` VARCHAR(191) NOT NULL,
    `quiz_id` VARCHAR(191) NOT NULL,
    `attempt_number` INTEGER NOT NULL DEFAULT 1,
    `score` DECIMAL(5, 2) NULL,
    `passed` BOOLEAN NULL,
    `answers` JSON NOT NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `submitted_at` DATETIME(3) NULL,
    `is_completed` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `zakat_academy_quiz_attempts_quiz_id_idx`(`quiz_id`),
    UNIQUE INDEX `zakat_academy_attempt_number_key`(`profile_id`, `quiz_id`, `attempt_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `zakat_academy_completion_records` (
    `id` VARCHAR(191) NOT NULL,
    `profile_id` VARCHAR(191) NOT NULL,
    `course_id` VARCHAR(191) NOT NULL,
    `is_eligible` BOOLEAN NOT NULL DEFAULT false,
    `completed_at` DATETIME(3) NULL,
    `certificate_url` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `zakat_academy_completion_records_course_id_idx`(`course_id`),
    UNIQUE INDEX `zakat_academy_completion_records_profile_id_course_id_key`(`profile_id`, `course_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `zakat_academy_settings` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `zakat_academy_settings_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `zakat_academy_profiles` ADD CONSTRAINT `zakat_academy_profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `zakat_academy_chapters` ADD CONSTRAINT `zakat_academy_chapters_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `zakat_academy_courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `zakat_academy_lessons` ADD CONSTRAINT `zakat_academy_lessons_chapter_id_fkey` FOREIGN KEY (`chapter_id`) REFERENCES `zakat_academy_chapters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `zakat_academy_lesson_attachments` ADD CONSTRAINT `zakat_academy_lesson_attachments_lesson_id_fkey` FOREIGN KEY (`lesson_id`) REFERENCES `zakat_academy_lessons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `zakat_academy_enrollments` ADD CONSTRAINT `zakat_academy_enrollments_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `zakat_academy_profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `zakat_academy_enrollments` ADD CONSTRAINT `zakat_academy_enrollments_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `zakat_academy_courses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `zakat_academy_lesson_progress` ADD CONSTRAINT `zakat_academy_lesson_progress_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `zakat_academy_profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `zakat_academy_lesson_progress` ADD CONSTRAINT `zakat_academy_lesson_progress_lesson_id_fkey` FOREIGN KEY (`lesson_id`) REFERENCES `zakat_academy_lessons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `zakat_academy_quizzes` ADD CONSTRAINT `zakat_academy_quizzes_chapter_id_fkey` FOREIGN KEY (`chapter_id`) REFERENCES `zakat_academy_chapters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `zakat_academy_quiz_questions` ADD CONSTRAINT `zakat_academy_quiz_questions_quiz_id_fkey` FOREIGN KEY (`quiz_id`) REFERENCES `zakat_academy_quizzes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `zakat_academy_quiz_options` ADD CONSTRAINT `zakat_academy_quiz_options_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `zakat_academy_quiz_questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `zakat_academy_quiz_attempts` ADD CONSTRAINT `zakat_academy_quiz_attempts_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `zakat_academy_profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `zakat_academy_quiz_attempts` ADD CONSTRAINT `zakat_academy_quiz_attempts_quiz_id_fkey` FOREIGN KEY (`quiz_id`) REFERENCES `zakat_academy_quizzes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `zakat_academy_completion_records` ADD CONSTRAINT `zakat_academy_completion_records_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `zakat_academy_profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `zakat_academy_completion_records` ADD CONSTRAINT `zakat_academy_completion_records_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `zakat_academy_courses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
