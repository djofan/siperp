-- CreateTable
CREATE TABLE `tanwir_members` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `role` ENUM('guru', 'peserta') NOT NULL,
    `phone` VARCHAR(191) NULL,
    `gender` ENUM('laki_laki', 'perempuan') NULL,
    `photo` TEXT NULL,
    `teaching_place` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `province_id` VARCHAR(191) NULL,
    `province_name` VARCHAR(191) NULL,
    `city_id` VARCHAR(191) NULL,
    `city_name` VARCHAR(191) NULL,
    `district_id` VARCHAR(191) NULL,
    `district_name` VARCHAR(191) NULL,
    `village_id` VARCHAR(191) NULL,
    `village_name` VARCHAR(191) NULL,
    `latitude` DECIMAL(10, 7) NULL,
    `longitude` DECIMAL(10, 7) NULL,
    `group_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tanwir_members_user_id_key`(`user_id`),
    UNIQUE INDEX `tanwir_members_code_key`(`code`),
    INDEX `tanwir_members_role_idx`(`role`),
    INDEX `tanwir_members_group_id_idx`(`group_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tanwir_groups` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `pic_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tanwir_groups_code_key`(`code`),
    INDEX `tanwir_groups_pic_id_idx`(`pic_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tanwir_tasks` (
    `id` VARCHAR(191) NOT NULL,
    `teacher_id` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `type` ENUM('voice_note', 'video', 'quiz') NOT NULL,
    `deadline` DATETIME(3) NOT NULL,
    `original_deadline` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `tanwir_tasks_teacher_id_idx`(`teacher_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tanwir_task_groups` (
    `task_id` VARCHAR(191) NOT NULL,
    `group_id` VARCHAR(191) NOT NULL,

    INDEX `tanwir_task_groups_group_id_idx`(`group_id`),
    PRIMARY KEY (`task_id`, `group_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tanwir_quiz_questions` (
    `id` VARCHAR(191) NOT NULL,
    `task_id` VARCHAR(191) NOT NULL,
    `question` TEXT NOT NULL,
    `option_a` TEXT NOT NULL,
    `option_b` TEXT NOT NULL,
    `option_c` TEXT NULL,
    `option_d` TEXT NULL,
    `correct_option` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `tanwir_quiz_questions_task_id_order_idx`(`task_id`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tanwir_submissions` (
    `id` VARCHAR(191) NOT NULL,
    `task_id` VARCHAR(191) NOT NULL,
    `student_id` VARCHAR(191) NOT NULL,
    `file_path` VARCHAR(191) NULL,
    `file_mime` VARCHAR(191) NULL,
    `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    `attempts_count` INTEGER NOT NULL DEFAULT 1,
    `score` INTEGER NULL,
    `is_late` BOOLEAN NOT NULL DEFAULT false,
    `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `tanwir_submissions_student_id_idx`(`student_id`),
    INDEX `tanwir_submissions_status_idx`(`status`),
    UNIQUE INDEX `tanwir_submissions_task_id_student_id_key`(`task_id`, `student_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tanwir_submission_logs` (
    `id` VARCHAR(191) NOT NULL,
    `submission_id` VARCHAR(191) NOT NULL,
    `reviewer_id` VARCHAR(191) NULL,
    `status` ENUM('pending', 'approved', 'rejected') NOT NULL,
    `feedback` TEXT NULL,
    `attempt_number` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `tanwir_submission_logs_submission_id_idx`(`submission_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tanwir_quiz_answers` (
    `id` VARCHAR(191) NOT NULL,
    `submission_id` VARCHAR(191) NOT NULL,
    `question_id` VARCHAR(191) NOT NULL,
    `selected_option` VARCHAR(191) NOT NULL,
    `is_correct` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `tanwir_quiz_answers_submission_id_question_id_key`(`submission_id`, `question_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tanwir_students` (
    `id` VARCHAR(191) NOT NULL,
    `member_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `age` INTEGER NULL,
    `class_name` VARCHAR(191) NULL,
    `parent_name` VARCHAR(191) NULL,
    `parent_phone` VARCHAR(191) NULL,
    `progress` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `tanwir_students_member_id_idx`(`member_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tanwir_members` ADD CONSTRAINT `tanwir_members_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tanwir_members` ADD CONSTRAINT `tanwir_members_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `tanwir_groups`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tanwir_groups` ADD CONSTRAINT `tanwir_groups_pic_id_fkey` FOREIGN KEY (`pic_id`) REFERENCES `tanwir_members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tanwir_tasks` ADD CONSTRAINT `tanwir_tasks_teacher_id_fkey` FOREIGN KEY (`teacher_id`) REFERENCES `tanwir_members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tanwir_task_groups` ADD CONSTRAINT `tanwir_task_groups_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `tanwir_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tanwir_task_groups` ADD CONSTRAINT `tanwir_task_groups_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `tanwir_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tanwir_quiz_questions` ADD CONSTRAINT `tanwir_quiz_questions_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `tanwir_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tanwir_submissions` ADD CONSTRAINT `tanwir_submissions_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `tanwir_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tanwir_submissions` ADD CONSTRAINT `tanwir_submissions_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `tanwir_members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tanwir_submission_logs` ADD CONSTRAINT `tanwir_submission_logs_submission_id_fkey` FOREIGN KEY (`submission_id`) REFERENCES `tanwir_submissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tanwir_submission_logs` ADD CONSTRAINT `tanwir_submission_logs_reviewer_id_fkey` FOREIGN KEY (`reviewer_id`) REFERENCES `tanwir_members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tanwir_quiz_answers` ADD CONSTRAINT `tanwir_quiz_answers_submission_id_fkey` FOREIGN KEY (`submission_id`) REFERENCES `tanwir_submissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tanwir_quiz_answers` ADD CONSTRAINT `tanwir_quiz_answers_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `tanwir_quiz_questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tanwir_students` ADD CONSTRAINT `tanwir_students_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `tanwir_members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

