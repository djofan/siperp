<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $created = [];
        if (! Schema::hasTable('users')) {
            $created[] = 'users';
            Schema::create('users', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('name', 191);
                $table->string('email', 191)->unique();
                $table->string('password_hash', 191);
                $table->boolean('is_superadmin')->default(false);
                $table->boolean('is_active')->default(true);
                $table->dateTime('created_at', 3)->useCurrent();
            });
        }
        if (! Schema::hasTable('access_logs')) {
            $created[] = 'access_logs';
            Schema::create('access_logs', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->text('message');
                $table->dateTime('created_at', 3)->useCurrent();
            });
        }
        if (! Schema::hasTable('modules')) {
            $created[] = 'modules';
            Schema::create('modules', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('slug', 191)->unique();
                $table->string('name', 191);
                $table->text('description')->nullable();
                $table->boolean('is_active')->default(true);
            });
        }
        if (! Schema::hasTable('module_access')) {
            $created[] = 'module_access';
            Schema::create('module_access', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('user_id', 191);
                $table->string('module_id', 191);
                $table->string('role', 191)->default('admin');
                $table->dateTime('created_at', 3)->useCurrent();
                $table->unique(['user_id', 'module_id'], 'module_access_392_unique');
            });
        }
        if (! Schema::hasTable('participant_sequences')) {
            $created[] = 'participant_sequences';
            Schema::create('participant_sequences', function (Blueprint $table): void {
                $table->string('module_slug', 191)->primary();
                $table->integer('last_number')->default(0);
            });
        }
        if (! Schema::hasTable('core_contacts')) {
            $created[] = 'core_contacts';
            Schema::create('core_contacts', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('name', 191);
                $table->string('phone', 191)->nullable();
                $table->string('email', 191)->nullable();
                $table->text('notes')->nullable();
                $table->dateTime('created_at', 3)->useCurrent();
                $table->dateTime('updated_at', 3)->useCurrent();
                $table->index(['phone'], 'core_contacts_253_index');
                $table->index(['email'], 'core_contacts_273_index');
            });
        }
        if (! Schema::hasTable('core_contact_sources')) {
            $created[] = 'core_contact_sources';
            Schema::create('core_contact_sources', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('contact_id', 191);
                $table->string('source', 191);
                $table->string('source_id', 191);
                $table->string('role', 191);
                $table->string('name', 191);
                $table->string('phone', 191)->nullable();
                $table->string('email', 191)->nullable();
                $table->dateTime('synced_at', 3)->useCurrent();
                $table->unique(['source', 'source_id'], 'core_contact_sources_341_unique');
            });
        }
        if (! Schema::hasTable('core_expenses')) {
            $created[] = 'core_expenses';
            Schema::create('core_expenses', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('account_id', 191);
                $table->string('module_source', 191);
                $table->string('fund_type', 191);
                $table->integer('amount');
                $table->text('description');
                $table->string('reference', 191)->unique();
                $table->dateTime('spent_at', 3);
                $table->string('created_by', 191);
                $table->dateTime('created_at', 3)->useCurrent();
                $table->index(['account_id', 'spent_at'], 'core_expenses_391_index');
            });
        }
        if (! Schema::hasTable('core_bank_lines')) {
            $created[] = 'core_bank_lines';
            Schema::create('core_bank_lines', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('account_id', 191);
                $table->dateTime('booked_at', 3);
                $table->string('reference', 191);
                $table->text('description');
                $table->string('direction', 191);
                $table->integer('amount');
                $table->string('fingerprint', 191)->unique();
                $table->string('payment_id', 191)->nullable()->unique();
                $table->string('expense_id', 191)->nullable()->unique();
                $table->text('match_note')->nullable();
                $table->string('matched_by', 191)->nullable();
                $table->dateTime('matched_at', 3)->nullable();
                $table->dateTime('created_at', 3)->useCurrent();
                $table->index(['account_id', 'booked_at'], 'core_bank_lines_608_index');
            });
        }
        if (! Schema::hasTable('zakat_academy_profiles')) {
            $created[] = 'zakat_academy_profiles';
            Schema::create('zakat_academy_profiles', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('user_id', 191)->unique();
                $table->string('nis', 191)->nullable()->unique();
                $table->string('phone', 191)->nullable()->unique();
                $table->text('address')->nullable();
                $table->enum('gender', ['IKHWAN', 'AKHWAT'])->nullable();
                $table->text('image')->nullable();
                $table->text('legacy_certificate_url')->nullable();
                $table->dateTime('created_at', 3)->useCurrent();
                $table->dateTime('updated_at', 3)->useCurrent();
                $table->boolean('must_change_password')->default(false);
                $table->dateTime('deleted_at', 3)->nullable();
            });
        }
        if (! Schema::hasTable('zakat_academy_courses')) {
            $created[] = 'zakat_academy_courses';
            Schema::create('zakat_academy_courses', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('title', 191);
                $table->string('slug', 191)->unique();
                $table->text('short_description');
                $table->text('description')->nullable();
                $table->text('thumbnail_url')->nullable();
                $table->text('material_url')->nullable();
                $table->boolean('is_published')->default(false);
                $table->integer('order')->default(0);
                $table->dateTime('created_at', 3)->useCurrent();
                $table->dateTime('updated_at', 3)->useCurrent();
                $table->string('teacher', 191)->default('Ustadz Irham');
                $table->integer('quota')->default(200);
                $table->integer('duration_days')->default(30);
                $table->dateTime('starts_at', 3)->nullable();
                $table->boolean('is_simulation')->default(false);
                $table->boolean('registration_open')->default(true);
                $table->index(['is_published', 'order'], 'zakat_academy_courses_1141_index');
            });
        }
        if (! Schema::hasTable('zakat_academy_chapters')) {
            $created[] = 'zakat_academy_chapters';
            Schema::create('zakat_academy_chapters', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('course_id', 191);
                $table->string('title', 191);
                $table->string('slug', 191);
                $table->text('description')->nullable();
                $table->integer('order')->default(0);
                $table->boolean('is_published')->default(false);
                $table->dateTime('created_at', 3)->useCurrent();
                $table->dateTime('updated_at', 3)->useCurrent();
                $table->unique(['course_id', 'slug'], 'zakat_academy_chapters_543_unique');
                $table->index(['course_id', 'is_published', 'order'], 'zakat_academy_chapters_573_index');
            });
        }
        if (! Schema::hasTable('zakat_academy_lessons')) {
            $created[] = 'zakat_academy_lessons';
            Schema::create('zakat_academy_lessons', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('chapter_id', 191);
                $table->string('title', 191);
                $table->string('slug', 191)->unique();
                $table->text('short_description')->nullable();
                $table->text('content_summary')->nullable();
                $table->text('thumbnail_url')->nullable();
                $table->enum('video_provider', ['AUDIO', 'YOUTUBE', 'VIMEO', 'BUNNY']);
                $table->text('video_url');
                $table->integer('order')->default(0);
                $table->boolean('is_published')->default(false);
                $table->dateTime('created_at', 3)->useCurrent();
                $table->dateTime('updated_at', 3)->useCurrent();
                $table->integer('release_day')->default(1);
                $table->index(['chapter_id', 'is_published', 'order'], 'zakat_academy_lessons_1227_index');
            });
        }
        if (! Schema::hasTable('zakat_academy_lesson_attachments')) {
            $created[] = 'zakat_academy_lesson_attachments';
            Schema::create('zakat_academy_lesson_attachments', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('lesson_id', 191);
                $table->string('title', 191);
                $table->text('file_url');
                $table->string('file_type', 191)->nullable();
                $table->integer('file_size')->nullable();
                $table->dateTime('created_at', 3)->useCurrent();
                $table->index(['lesson_id'], 'zakat_academy_lesson_attachments_392_index');
            });
        }
        if (! Schema::hasTable('zakat_academy_enrollments')) {
            $created[] = 'zakat_academy_enrollments';
            Schema::create('zakat_academy_enrollments', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('profile_id', 191);
                $table->string('course_id', 191);
                $table->dateTime('created_at', 3)->useCurrent();
                $table->dateTime('group_joined_at', 3)->nullable();
                $table->unique(['profile_id', 'course_id'], 'zakat_academy_enrollments_439_unique');
                $table->index(['course_id'], 'zakat_academy_enrollments_474_index');
            });
        }
        if (! Schema::hasTable('zakat_academy_lesson_progress')) {
            $created[] = 'zakat_academy_lesson_progress';
            Schema::create('zakat_academy_lesson_progress', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('profile_id', 191);
                $table->string('lesson_id', 191);
                $table->boolean('completed')->default(false);
                $table->dateTime('completed_at', 3)->nullable();
                $table->dateTime('created_at', 3)->useCurrent();
                $table->dateTime('updated_at', 3)->useCurrent();
                $table->double('audio_position')->default(0);
                $table->text('audio_source')->nullable();
                $table->unique(['profile_id', 'lesson_id'], 'zakat_academy_lesson_progress_653_unique');
                $table->index(['lesson_id'], 'zakat_academy_lesson_progress_688_index');
            });
        }
        if (! Schema::hasTable('zakat_academy_quizzes')) {
            $created[] = 'zakat_academy_quizzes';
            Schema::create('zakat_academy_quizzes', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('chapter_id', 191);
                $table->string('title', 191);
                $table->text('description')->nullable();
                $table->integer('passing_score')->default(70);
                $table->boolean('is_published')->default(false);
                $table->boolean('is_active')->default(false);
                $table->dateTime('quiz_date', 3)->nullable();
                $table->integer('time_limit_minutes')->default(10);
                $table->boolean('allow_retake')->default(false);
                $table->dateTime('created_at', 3)->useCurrent();
                $table->dateTime('updated_at', 3)->useCurrent();
                $table->enum('kind', ['DAILY', 'WEEKLY', 'FINAL'])->default('DAILY');
                $table->dateTime('closes_at', 3)->nullable();
                $table->integer('release_day')->default(1);
                $table->index(['chapter_id'], 'zakat_academy_quizzes_1023_index');
                $table->index(['is_published', 'is_active', 'quiz_date'], 'zakat_academy_quizzes_1047_index');
            });
        }
        if (! Schema::hasTable('zakat_academy_quiz_questions')) {
            $created[] = 'zakat_academy_quiz_questions';
            Schema::create('zakat_academy_quiz_questions', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('quiz_id', 191);
                $table->text('question');
                $table->integer('order')->default(0);
                $table->dateTime('created_at', 3)->useCurrent();
                $table->enum('type', ['SINGLE', 'TRUE_FALSE', 'MULTIPLE'])->default('SINGLE');
                $table->integer('weight')->default(1);
                $table->text('explanation')->nullable();
                $table->index(['quiz_id', 'order'], 'zakat_academy_quiz_questions_459_index');
            });
        }
        if (! Schema::hasTable('academy_notification_reads')) {
            $created[] = 'academy_notification_reads';
            Schema::create('academy_notification_reads', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('profile_id', 191);
                $table->string('key', 191);
                $table->dateTime('read_at', 3)->useCurrent();
                $table->unique(['profile_id', 'key'], 'academy_notification_reads_258_unique');
            });
        }
        if (! Schema::hasTable('academy_study_notes')) {
            $created[] = 'academy_study_notes';
            Schema::create('academy_study_notes', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('profile_id', 191);
                $table->string('lesson_id', 191);
                $table->text('content');
                $table->dateTime('updated_at', 3)->useCurrent();
                $table->unique(['profile_id', 'lesson_id'], 'academy_study_notes_403_unique');
            });
        }
        if (! Schema::hasTable('academy_live_sessions')) {
            $created[] = 'academy_live_sessions';
            Schema::create('academy_live_sessions', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('course_id', 191);
                $table->string('title', 191);
                $table->dateTime('starts_at', 3);
                $table->text('join_url');
                $table->index(['course_id', 'starts_at'], 'academy_live_sessions_282_index');
            });
        }
        if (! Schema::hasTable('academy_discussions')) {
            $created[] = 'academy_discussions';
            Schema::create('academy_discussions', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('course_id', 191);
                $table->string('profile_id', 191);
                $table->text('question');
                $table->text('answer')->nullable();
                $table->dateTime('created_at', 3)->useCurrent();
                $table->dateTime('answered_at', 3)->nullable();
                $table->index(['course_id', 'created_at'], 'academy_discussions_484_index');
            });
        }
        if (! Schema::hasTable('zakat_academy_quiz_options')) {
            $created[] = 'zakat_academy_quiz_options';
            Schema::create('zakat_academy_quiz_options', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('question_id', 191);
                $table->text('label');
                $table->boolean('is_correct')->default(false);
                $table->index(['question_id'], 'zakat_academy_quiz_options_287_index');
            });
        }
        if (! Schema::hasTable('zakat_academy_quiz_attempts')) {
            $created[] = 'zakat_academy_quiz_attempts';
            Schema::create('zakat_academy_quiz_attempts', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('profile_id', 191);
                $table->string('quiz_id', 191);
                $table->integer('attempt_number')->default(1);
                $table->decimal('score', 5, 2)->nullable();
                $table->boolean('passed')->nullable();
                $table->json('answers');
                $table->dateTime('started_at', 3)->useCurrent();
                $table->dateTime('submitted_at', 3)->nullable();
                $table->boolean('is_completed')->default(false);
                $table->dateTime('created_at', 3)->useCurrent();
                $table->unique(['profile_id', 'quiz_id', 'attempt_number'], 'zakat_academy_quiz_attempts_753_unique');
                $table->index(['quiz_id'], 'zakat_academy_quiz_attempts_842_index');
            });
        }
        if (! Schema::hasTable('zakat_academy_completion_records')) {
            $created[] = 'zakat_academy_completion_records';
            Schema::create('zakat_academy_completion_records', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('profile_id', 191);
                $table->string('course_id', 191);
                $table->boolean('is_eligible')->default(false);
                $table->dateTime('completed_at', 3)->nullable();
                $table->text('certificate_url')->nullable();
                $table->dateTime('created_at', 3)->useCurrent();
                $table->dateTime('updated_at', 3)->useCurrent();
                $table->unique(['profile_id', 'course_id'], 'zakat_academy_completion_records_644_unique');
                $table->index(['course_id'], 'zakat_academy_completion_records_679_index');
            });
        }
        if (! Schema::hasTable('zakat_academy_settings')) {
            $created[] = 'zakat_academy_settings';
            Schema::create('zakat_academy_settings', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('key', 191)->unique();
                $table->text('value');
                $table->dateTime('updated_at', 3)->useCurrent();
            });
        }
        if (! Schema::hasTable('lazsip_site_content')) {
            $created[] = 'lazsip_site_content';
            Schema::create('lazsip_site_content', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('section_key', 191)->unique();
                $table->text('content_json');
            });
        }
        if (! Schema::hasTable('lazsip_news')) {
            $created[] = 'lazsip_news';
            Schema::create('lazsip_news', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('title', 191);
                $table->text('content');
                $table->string('image', 191)->nullable();
                $table->boolean('is_pinned')->default(false);
                $table->string('status', 191)->default('draft');
                $table->dateTime('created_at', 3)->useCurrent();
            });
        }
        if (! Schema::hasTable('lazsip_partners')) {
            $created[] = 'lazsip_partners';
            Schema::create('lazsip_partners', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('name', 191);
                $table->string('logo', 191)->nullable();
                $table->string('url', 191)->nullable();
            });
        }
        if (! Schema::hasTable('lazsip_programs')) {
            $created[] = 'lazsip_programs';
            Schema::create('lazsip_programs', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('title', 191);
                $table->text('description');
                $table->text('requirements')->nullable();
                $table->string('image', 191)->nullable();
                $table->string('category', 191)->default('umum');
                $table->string('type', 191)->default('berita');
                $table->string('form_url', 191)->nullable();
                $table->boolean('is_pinned')->default(false);
                $table->boolean('registration_open')->default(true);
                $table->dateTime('created_at', 3)->useCurrent();
            });
        }
        if (! Schema::hasTable('lazsip_program_applicants')) {
            $created[] = 'lazsip_program_applicants';
            Schema::create('lazsip_program_applicants', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('program_id', 191);
                $table->string('name', 191);
                $table->string('contact', 191);
                $table->string('status', 191)->default('baru');
                $table->dateTime('created_at', 3)->useCurrent();
            });
        }
        if (! Schema::hasTable('lazsip_activities')) {
            $created[] = 'lazsip_activities';
            Schema::create('lazsip_activities', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('title', 191);
                $table->text('description');
                $table->string('image', 191)->nullable();
                $table->dateTime('date', 3);
                $table->boolean('is_pinned')->default(false);
                $table->dateTime('created_at', 3)->useCurrent();
            });
        }
        if (! Schema::hasTable('lazsip_campaigns')) {
            $created[] = 'lazsip_campaigns';
            Schema::create('lazsip_campaigns', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('title', 191);
                $table->text('description');
                $table->integer('target_amount');
                $table->integer('current_amount')->default(0);
                $table->string('image', 191)->nullable();
                $table->string('unique_code', 191)->unique();
                $table->boolean('is_pinned')->default(false);
                $table->string('status', 191)->default('active');
                $table->dateTime('created_at', 3)->useCurrent();
            });
        }
        if (! Schema::hasTable('lazsip_campaign_adjustments')) {
            $created[] = 'lazsip_campaign_adjustments';
            Schema::create('lazsip_campaign_adjustments', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('campaign_id', 191);
                $table->integer('amount');
                $table->text('note');
                $table->dateTime('created_at', 3)->useCurrent();
            });
        }
        if (! Schema::hasTable('lazsip_donations')) {
            $created[] = 'lazsip_donations';
            Schema::create('lazsip_donations', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('campaign_id', 191);
                $table->string('donor_id', 191);
                $table->integer('amount');
                $table->integer('admin_fee')->default(0);
                $table->boolean('covers_fee')->default(true);
                $table->boolean('is_anonymous')->default(false);
                $table->string('payment_method', 191);
                $table->string('status', 191)->default('pending');
                $table->dateTime('created_at', 3)->useCurrent();
            });
        }
        if (! Schema::hasTable('lazsip_zakat_payments')) {
            $created[] = 'lazsip_zakat_payments';
            Schema::create('lazsip_zakat_payments', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('donor_id', 191);
                $table->string('zakat_type', 191)->default('maal');
                $table->integer('amount');
                $table->integer('admin_fee')->default(0);
                $table->boolean('covers_fee')->default(true);
                $table->boolean('is_anonymous')->default(false);
                $table->integer('gold_price_snapshot')->nullable();
                $table->integer('jiwa_count')->nullable();
                $table->string('payment_method', 191);
                $table->string('status', 191)->default('pending');
                $table->dateTime('created_at', 3)->useCurrent();
            });
        }
        if (! Schema::hasTable('lazsip_zakat_details')) {
            $created[] = 'lazsip_zakat_details';
            Schema::create('lazsip_zakat_details', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('zakat_type', 191);
                $table->integer('gold_price_snapshot')->nullable();
                $table->integer('jiwa_count')->nullable();
                $table->dateTime('created_at', 3)->useCurrent();
            });
        }
        if (! Schema::hasTable('lazsip_payment_fee_refs')) {
            $created[] = 'lazsip_payment_fee_refs';
            Schema::create('lazsip_payment_fee_refs', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('method', 191)->unique();
                $table->integer('fee_amount')->nullable();
                $table->double('fee_percentage')->nullable();
            });
        }
        if (! Schema::hasTable('lazsip_beneficiaries')) {
            $created[] = 'lazsip_beneficiaries';
            Schema::create('lazsip_beneficiaries', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('name', 191);
                $table->text('address');
                $table->text('problem_faced');
                $table->dateTime('birth_date', 3);
                $table->integer('age');
                $table->string('gender', 191);
                $table->string('referral_source', 191);
                $table->string('photo', 191)->nullable();
                $table->text('needs');
                $table->string('aid_type', 191);
                $table->integer('amount_received');
                $table->string('verifier_name', 191);
                $table->string('verifier_area', 191);
                $table->string('marital_status', 191);
                $table->string('nik', 191)->nullable();
                $table->string('occupation', 191)->nullable();
                $table->integer('monthly_income')->nullable();
                $table->integer('dependents_count')->nullable();
                $table->text('dependents_detail')->nullable();
                $table->boolean('is_pinned')->default(false);
                $table->dateTime('created_at', 3)->useCurrent();
            });
        }
        if (! Schema::hasTable('lazsip_history_otp')) {
            $created[] = 'lazsip_history_otp';
            Schema::create('lazsip_history_otp', function (Blueprint $table): void {
                $table->string('email_key', 191)->primary();
                $table->string('challenge_id', 191)->nullable();
                $table->string('code_hash', 191)->nullable();
                $table->dateTime('expires_at', 3)->nullable();
                $table->integer('attempts')->default(0);
                $table->integer('send_count')->default(0);
                $table->dateTime('sent_at', 3)->nullable();
                $table->dateTime('window_start', 3)->nullable();
            });
        }
        if (! Schema::hasTable('ojol_members')) {
            $created[] = 'ojol_members';
            Schema::create('ojol_members', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('user_id', 191)->unique();
                $table->string('code', 191)->unique();
                $table->enum('role', ['guru', 'peserta']);
                $table->string('phone', 191)->nullable();
                $table->enum('gender', ['laki_laki', 'perempuan'])->nullable();
                $table->text('photo')->nullable();
                $table->text('address')->nullable();
                $table->string('province_id', 191)->nullable();
                $table->string('province_name', 191)->nullable();
                $table->string('city_id', 191)->nullable();
                $table->string('city_name', 191)->nullable();
                $table->string('district_id', 191)->nullable();
                $table->string('district_name', 191)->nullable();
                $table->string('village_id', 191)->nullable();
                $table->string('village_name', 191)->nullable();
                $table->decimal('latitude', 10, 7)->nullable();
                $table->decimal('longitude', 10, 7)->nullable();
                $table->string('group_id', 191)->nullable();
                $table->dateTime('created_at', 3)->useCurrent();
                $table->dateTime('updated_at', 3)->useCurrent();
                $table->index(['role'], 'ojol_members_1353_index');
                $table->index(['group_id'], 'ojol_members_1372_index');
            });
        }
        if (! Schema::hasTable('ojol_groups')) {
            $created[] = 'ojol_groups';
            Schema::create('ojol_groups', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('code', 191)->unique();
                $table->string('name', 191);
                $table->text('description')->nullable();
                $table->dateTime('created_at', 3)->useCurrent();
                $table->dateTime('updated_at', 3)->useCurrent();
            });
        }
        if (! Schema::hasTable('ojol_tasks')) {
            $created[] = 'ojol_tasks';
            Schema::create('ojol_tasks', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('teacher_id', 191)->nullable();
                $table->string('title', 191);
                $table->text('description');
                $table->enum('type', ['voice_note', 'video', 'quiz']);
                $table->dateTime('deadline', 3);
                $table->dateTime('original_deadline', 3);
                $table->dateTime('created_at', 3)->useCurrent();
                $table->dateTime('updated_at', 3)->useCurrent();
                $table->index(['teacher_id'], 'ojol_tasks_683_index');
            });
        }
        if (! Schema::hasTable('ojol_task_groups')) {
            $created[] = 'ojol_task_groups';
            Schema::create('ojol_task_groups', function (Blueprint $table): void {
                $table->string('task_id', 191);
                $table->string('group_id', 191);
                $table->index(['group_id'], 'ojol_task_groups_273_index');
                $table->primary(['task_id', 'group_id']);
            });
        }
        if (! Schema::hasTable('ojol_quiz_questions')) {
            $created[] = 'ojol_quiz_questions';
            Schema::create('ojol_quiz_questions', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('task_id', 191);
                $table->text('question');
                $table->text('option_a');
                $table->text('option_b');
                $table->text('option_c')->nullable();
                $table->text('option_d')->nullable();
                $table->string('correct_option', 191);
                $table->integer('order')->default(0);
                $table->dateTime('created_at', 3)->useCurrent();
                $table->index(['task_id', 'order'], 'ojol_quiz_questions_612_index');
            });
        }
        if (! Schema::hasTable('ojol_submissions')) {
            $created[] = 'ojol_submissions';
            Schema::create('ojol_submissions', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('task_id', 191);
                $table->string('student_id', 191);
                $table->string('file_path', 191)->nullable();
                $table->string('file_mime', 191)->nullable();
                $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
                $table->integer('attempts_count')->default(1);
                $table->integer('score')->nullable();
                $table->boolean('is_late')->default(false);
                $table->dateTime('submitted_at', 3)->useCurrent();
                $table->dateTime('created_at', 3)->useCurrent();
                $table->dateTime('updated_at', 3)->useCurrent();
                $table->unique(['task_id', 'student_id'], 'ojol_submissions_1004_unique');
                $table->index(['student_id'], 'ojol_submissions_1037_index');
                $table->index(['status'], 'ojol_submissions_1061_index');
            });
        }
        if (! Schema::hasTable('ojol_submission_logs')) {
            $created[] = 'ojol_submission_logs';
            Schema::create('ojol_submission_logs', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('submission_id', 191);
                $table->string('reviewer_id', 191)->nullable();
                $table->enum('status', ['pending', 'approved', 'rejected']);
                $table->text('feedback')->nullable();
                $table->integer('attempt_number');
                $table->dateTime('created_at', 3)->useCurrent();
                $table->index(['submission_id'], 'ojol_submission_logs_614_index');
            });
        }
        if (! Schema::hasTable('ojol_quiz_answers')) {
            $created[] = 'ojol_quiz_answers';
            Schema::create('ojol_quiz_answers', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('submission_id', 191);
                $table->string('question_id', 191);
                $table->string('selected_option', 191);
                $table->boolean('is_correct')->default(false);
                $table->unique(['submission_id', 'question_id'], 'ojol_quiz_answers_462_unique');
            });
        }
        if (! Schema::hasTable('ojol_task_approvers')) {
            $created[] = 'ojol_task_approvers';
            Schema::create('ojol_task_approvers', function (Blueprint $table): void {
                $table->string('task_id', 191);
                $table->string('teacher_id', 191);
                $table->index(['teacher_id'], 'ojol_task_approvers_289_index');
                $table->primary(['task_id', 'teacher_id']);
            });
        }
        if (! Schema::hasTable('payment_donors')) {
            $created[] = 'payment_donors';
            Schema::create('payment_donors', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('name', 191);
                $table->string('phone', 191)->nullable()->unique();
                $table->string('email', 191)->nullable()->unique();
                $table->dateTime('created_at', 3)->useCurrent();
            });
        }
        if (! Schema::hasTable('payment_transactions')) {
            $created[] = 'payment_transactions';
            Schema::create('payment_transactions', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('tracking_code', 191)->unique();
                $table->string('module_source', 191);
                $table->string('source_type', 191);
                $table->string('source_id', 191);
                $table->string('fund_type', 191);
                $table->string('donor_id', 191);
                $table->boolean('is_anonymous')->default(false);
                $table->integer('amount');
                $table->integer('admin_fee')->default(0);
                $table->string('payment_method', 191);
                $table->string('destination_account_id', 191);
                $table->string('status', 191)->default('pending');
                $table->string('midtrans_order_id', 191)->nullable()->unique();
                $table->string('gateway', 191)->default('simulation');
                $table->string('gateway_state', 191)->default('not_started');
                $table->string('gateway_merchant_id', 191)->nullable();
                $table->text('gateway_checkout_url')->nullable();
                $table->dateTime('created_at', 3)->useCurrent();
                $table->dateTime('paid_at', 3)->nullable();
                $table->index(['module_source', 'source_type', 'source_id', 'status'], 'payment_transactions_1418_index');
            });
        }
        if (! Schema::hasTable('payment_receipts')) {
            $created[] = 'payment_receipts';
            Schema::create('payment_receipts', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('transaction_id', 191)->unique();
                $table->string('recipient', 191);
                $table->string('subject', 191);
                $table->text('html');
                $table->text('text');
                $table->string('sender', 191)->nullable();
                $table->string('status', 191)->default('pending');
                $table->integer('attempts')->default(0);
                $table->dateTime('first_attempt_at', 3)->nullable();
                $table->dateTime('locked_until', 3)->nullable();
                $table->dateTime('next_attempt_at', 3)->useCurrent();
                $table->dateTime('sent_at', 3)->nullable();
                $table->string('provider_id', 191)->nullable();
                $table->string('last_error', 191)->nullable();
                $table->dateTime('created_at', 3)->useCurrent();
                $table->index(['status', 'next_attempt_at'], 'payment_receipts_708_index');
            });
        }
        if (! Schema::hasTable('payment_destination_accounts')) {
            $created[] = 'payment_destination_accounts';
            Schema::create('payment_destination_accounts', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('module_source', 191);
                $table->string('fund_type', 191);
                $table->string('bank_name', 191);
                $table->string('account_number', 191);
                $table->string('account_name', 191);
            });
        }
        if (! Schema::hasTable('sarsip_beneficiaries')) {
            $created[] = 'sarsip_beneficiaries';
            Schema::create('sarsip_beneficiaries', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('name', 191);
                $table->string('phone', 191)->nullable();
                $table->string('location', 191);
                $table->string('assistance', 191);
                $table->string('public_name', 191)->nullable();
                $table->string('category', 191)->default('Lainnya');
                $table->integer('amount')->default(0);
                $table->string('image', 191)->nullable();
                $table->boolean('is_published')->default(false);
                $table->dateTime('received_at', 3);
                $table->text('notes')->nullable();
                $table->dateTime('archived_at', 3)->nullable();
                $table->dateTime('created_at', 3)->useCurrent();
                $table->dateTime('updated_at', 3)->useCurrent();
                $table->index(['archived_at', 'created_at'], 'sarsip_beneficiaries_577_index');
            });
        }
        if (! Schema::hasTable('sarsip_entries')) {
            $created[] = 'sarsip_entries';
            Schema::create('sarsip_entries', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('kind', 191);
                $table->string('title', 191);
                $table->text('description');
                $table->string('location', 191)->nullable();
                $table->dateTime('event_date', 3)->nullable();
                $table->string('image', 191)->nullable();
                $table->integer('target_amount')->default(0);
                $table->string('status', 191)->default('draft');
                $table->dateTime('created_at', 3)->useCurrent();
                $table->dateTime('updated_at', 3)->useCurrent();
                $table->index(['kind', 'status', 'created_at'], 'sarsip_entries_444_index');
            });
        }
        if (! Schema::hasTable('sarsip_profiles')) {
            $created[] = 'sarsip_profiles';
            Schema::create('sarsip_profiles', function (Blueprint $table): void {
                $table->string('id', 191)->primary()->default('main');
                $table->string('headline', 191);
                $table->text('description');
                $table->string('contact', 191)->nullable();
            });
        }
        if (! Schema::hasTable('sarsip_payment_methods')) {
            $created[] = 'sarsip_payment_methods';
            Schema::create('sarsip_payment_methods', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('method', 191)->unique();
                $table->integer('fee_amount')->nullable();
                $table->double('fee_percentage')->nullable();
            });
        }
        if (! Schema::hasTable('sip_site_content')) {
            $created[] = 'sip_site_content';
            Schema::create('sip_site_content', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('section_key', 191)->unique();
                $table->text('content_json');
            });
        }
        if (! Schema::hasTable('sip_program_bantuan')) {
            $created[] = 'sip_program_bantuan';
            Schema::create('sip_program_bantuan', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('title', 191);
                $table->string('slug', 191)->unique();
                $table->text('description');
                $table->string('image', 191)->nullable();
                $table->string('campaign_url', 191)->nullable();
                $table->boolean('is_pinned')->default(false);
                $table->dateTime('created_at', 3)->useCurrent();
            });
        }
        if (! Schema::hasTable('sip_news')) {
            $created[] = 'sip_news';
            Schema::create('sip_news', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('title', 191);
                $table->text('content');
                $table->string('image', 191)->nullable();
                $table->boolean('is_pinned')->default(false);
                $table->string('status', 191)->default('draft');
                $table->dateTime('created_at', 3)->useCurrent();
            });
        }
        if (! Schema::hasTable('sip_penyaluran_bantuan')) {
            $created[] = 'sip_penyaluran_bantuan';
            Schema::create('sip_penyaluran_bantuan', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('title', 191);
                $table->text('description');
                $table->string('image', 191)->nullable();
                $table->string('location', 191)->nullable();
                $table->dateTime('date', 3);
                $table->dateTime('created_at', 3)->useCurrent();
            });
        }
        if (! Schema::hasTable('sip_laporan')) {
            $created[] = 'sip_laporan';
            Schema::create('sip_laporan', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('title', 191);
                $table->string('type', 191);
                $table->integer('period_month')->nullable();
                $table->integer('period_year');
                $table->string('file_url', 191);
                $table->dateTime('created_at', 3)->useCurrent();
            });
        }
        if (! Schema::hasTable('tanwir_members')) {
            $created[] = 'tanwir_members';
            Schema::create('tanwir_members', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('user_id', 191)->unique();
                $table->string('code', 191)->unique();
                $table->enum('role', ['guru', 'peserta']);
                $table->string('phone', 191)->nullable();
                $table->enum('gender', ['laki_laki', 'perempuan'])->nullable();
                $table->text('photo')->nullable();
                $table->string('teaching_place', 191)->nullable();
                $table->text('address')->nullable();
                $table->string('province_id', 191)->nullable();
                $table->string('province_name', 191)->nullable();
                $table->string('city_id', 191)->nullable();
                $table->string('city_name', 191)->nullable();
                $table->string('district_id', 191)->nullable();
                $table->string('district_name', 191)->nullable();
                $table->string('village_id', 191)->nullable();
                $table->string('village_name', 191)->nullable();
                $table->decimal('latitude', 10, 7)->nullable();
                $table->decimal('longitude', 10, 7)->nullable();
                $table->string('group_id', 191)->nullable();
                $table->dateTime('created_at', 3)->useCurrent();
                $table->dateTime('updated_at', 3)->useCurrent();
                $table->index(['role'], 'tanwir_members_1484_index');
                $table->index(['group_id'], 'tanwir_members_1503_index');
            });
        }
        if (! Schema::hasTable('tanwir_groups')) {
            $created[] = 'tanwir_groups';
            Schema::create('tanwir_groups', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('code', 191)->unique();
                $table->string('name', 191);
                $table->text('description')->nullable();
                $table->string('pic_id', 191)->nullable();
                $table->dateTime('created_at', 3)->useCurrent();
                $table->dateTime('updated_at', 3)->useCurrent();
                $table->index(['pic_id'], 'tanwir_groups_496_index');
            });
        }
        if (! Schema::hasTable('tanwir_tasks')) {
            $created[] = 'tanwir_tasks';
            Schema::create('tanwir_tasks', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('teacher_id', 191)->nullable();
                $table->string('title', 191);
                $table->text('description');
                $table->enum('type', ['voice_note', 'video', 'quiz']);
                $table->dateTime('deadline', 3);
                $table->dateTime('original_deadline', 3);
                $table->dateTime('created_at', 3)->useCurrent();
                $table->dateTime('updated_at', 3)->useCurrent();
                $table->index(['teacher_id'], 'tanwir_tasks_659_index');
            });
        }
        if (! Schema::hasTable('tanwir_task_groups')) {
            $created[] = 'tanwir_task_groups';
            Schema::create('tanwir_task_groups', function (Blueprint $table): void {
                $table->string('task_id', 191);
                $table->string('group_id', 191);
                $table->index(['group_id'], 'tanwir_task_groups_277_index');
                $table->primary(['task_id', 'group_id']);
            });
        }
        if (! Schema::hasTable('tanwir_quiz_questions')) {
            $created[] = 'tanwir_quiz_questions';
            Schema::create('tanwir_quiz_questions', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('task_id', 191);
                $table->text('question');
                $table->text('option_a');
                $table->text('option_b');
                $table->text('option_c')->nullable();
                $table->text('option_d')->nullable();
                $table->string('correct_option', 191);
                $table->integer('order')->default(0);
                $table->dateTime('created_at', 3)->useCurrent();
                $table->index(['task_id', 'order'], 'tanwir_quiz_questions_616_index');
            });
        }
        if (! Schema::hasTable('tanwir_submissions')) {
            $created[] = 'tanwir_submissions';
            Schema::create('tanwir_submissions', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('task_id', 191);
                $table->string('student_id', 191);
                $table->string('file_path', 191)->nullable();
                $table->string('file_mime', 191)->nullable();
                $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
                $table->integer('attempts_count')->default(1);
                $table->integer('score')->nullable();
                $table->boolean('is_late')->default(false);
                $table->dateTime('submitted_at', 3)->useCurrent();
                $table->dateTime('created_at', 3)->useCurrent();
                $table->dateTime('updated_at', 3)->useCurrent();
                $table->unique(['task_id', 'student_id'], 'tanwir_submissions_1014_unique');
                $table->index(['student_id'], 'tanwir_submissions_1047_index');
                $table->index(['status'], 'tanwir_submissions_1071_index');
            });
        }
        if (! Schema::hasTable('tanwir_submission_logs')) {
            $created[] = 'tanwir_submission_logs';
            Schema::create('tanwir_submission_logs', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('submission_id', 191);
                $table->string('reviewer_id', 191)->nullable();
                $table->enum('status', ['pending', 'approved', 'rejected']);
                $table->text('feedback')->nullable();
                $table->integer('attempt_number');
                $table->dateTime('created_at', 3)->useCurrent();
                $table->index(['submission_id'], 'tanwir_submission_logs_620_index');
            });
        }
        if (! Schema::hasTable('tanwir_quiz_answers')) {
            $created[] = 'tanwir_quiz_answers';
            Schema::create('tanwir_quiz_answers', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('submission_id', 191);
                $table->string('question_id', 191);
                $table->string('selected_option', 191);
                $table->boolean('is_correct')->default(false);
                $table->unique(['submission_id', 'question_id'], 'tanwir_quiz_answers_466_unique');
            });
        }
        if (! Schema::hasTable('tanwir_students')) {
            $created[] = 'tanwir_students';
            Schema::create('tanwir_students', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('member_id', 191);
                $table->string('name', 191);
                $table->integer('age')->nullable();
                $table->string('class_name', 191)->nullable();
                $table->string('parent_name', 191)->nullable();
                $table->string('parent_phone', 191)->nullable();
                $table->text('progress')->nullable();
                $table->dateTime('created_at', 3)->useCurrent();
                $table->dateTime('updated_at', 3)->useCurrent();
                $table->index(['member_id'], 'tanwir_students_505_index');
            });
        }
        if (! Schema::hasTable('teknisi_participants')) {
            $created[] = 'teknisi_participants';
            Schema::create('teknisi_participants', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('userId', 191)->unique();
                $table->string('nip', 191)->unique();
                $table->text('address');
                $table->string('phone', 191)->nullable()->unique();
                $table->dateTime('createdAt', 3)->useCurrent();
                $table->dateTime('deleted_at', 3)->nullable();
            });
        }
        if (! Schema::hasTable('teknisi_outlets')) {
            $created[] = 'teknisi_outlets';
            Schema::create('teknisi_outlets', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('name', 191);
                $table->text('address');
                $table->string('phone', 191);
                $table->boolean('isActive')->default(true);
                $table->dateTime('createdAt', 3)->useCurrent();
            });
        }
        if (! Schema::hasTable('teknisi_technicians')) {
            $created[] = 'teknisi_technicians';
            Schema::create('teknisi_technicians', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('userId', 191)->unique();
                $table->string('name', 191);
                $table->string('outletId', 191);
                $table->string('specialty', 191);
                $table->boolean('isActive')->default(true);
                $table->string('active_outlet_id', 191)->nullable()->unique();
            });
        }
        if (! Schema::hasTable('teknisi_tickets')) {
            $created[] = 'teknisi_tickets';
            Schema::create('teknisi_tickets', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('number', 191)->unique();
                $table->string('trackingToken', 191)->unique();
                $table->string('outletId', 191);
                $table->string('technicianId', 191)->nullable();
                $table->string('participantId', 191)->nullable();
                $table->string('customerName', 191);
                $table->string('customerPhone', 191);
                $table->string('device', 191);
                $table->string('imei', 191)->nullable();
                $table->text('complaint');
                $table->text('accessories')->nullable();
                $table->string('status', 191)->default('received');
                $table->string('priority', 191)->default('normal');
                $table->integer('estimate')->default(0);
                $table->integer('serviceCost')->default(0);
                $table->dateTime('dueAt', 3)->nullable();
                $table->dateTime('createdAt', 3)->useCurrent();
                $table->dateTime('updatedAt', 3)->useCurrent();
                $table->index(['outletId', 'status', 'createdAt'], 'teknisi_tickets_847_index');
                $table->index(['technicianId', 'status'], 'teknisi_tickets_889_index');
                $table->index(['participantId'], 'teknisi_tickets_924_index');
            });
        }
        if (! Schema::hasTable('teknisi_events')) {
            $created[] = 'teknisi_events';
            Schema::create('teknisi_events', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('ticketId', 191);
                $table->string('status', 191);
                $table->text('note');
                $table->string('actorName', 191);
                $table->dateTime('createdAt', 3)->useCurrent();
                $table->index(['ticketId', 'createdAt'], 'teknisi_events_228_index');
            });
        }
        if (! Schema::hasTable('teknisi_parts')) {
            $created[] = 'teknisi_parts';
            Schema::create('teknisi_parts', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('outletId', 191);
                $table->string('sku', 191);
                $table->string('name', 191);
                $table->integer('stock')->default(0);
                $table->integer('minimum')->default(3);
                $table->integer('price')->default(0);
                $table->unique(['outletId', 'sku'], 'teknisi_parts_296_unique');
            });
        }
        if (! Schema::hasTable('teknisi_part_uses')) {
            $created[] = 'teknisi_part_uses';
            Schema::create('teknisi_part_uses', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('ticketId', 191);
                $table->string('partId', 191);
                $table->integer('quantity');
                $table->integer('unitPrice');
                $table->dateTime('createdAt', 3)->useCurrent();
            });
        }
        if (! Schema::hasTable('teknisi_stock_movements')) {
            $created[] = 'teknisi_stock_movements';
            Schema::create('teknisi_stock_movements', function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('partId', 191);
                $table->integer('quantity');
                $table->string('note', 191);
                $table->string('actorName', 191);
                $table->dateTime('createdAt', 3)->useCurrent();
            });
        }
        if (in_array('module_access', $created, true)) {
            Schema::table('module_access', function (Blueprint $table): void {
                $table->foreign(['user_id'], 'module_access_user_id_fk')->references(['id'])->on('users')->onDelete('cascade')->onUpdate('cascade');
                $table->foreign(['module_id'], 'module_access_module_id_fk')->references(['id'])->on('modules')->onDelete('cascade')->onUpdate('cascade');
            });
        }
        if (in_array('core_contact_sources', $created, true)) {
            Schema::table('core_contact_sources', function (Blueprint $table): void {
                $table->foreign(['contact_id'], 'core_contact_sources_contact_id_fk')->references(['id'])->on('core_contacts')->onDelete('cascade')->onUpdate('cascade');
            });
        }
        if (in_array('core_bank_lines', $created, true)) {
            Schema::table('core_bank_lines', function (Blueprint $table): void {
                $table->foreign(['expense_id'], 'core_bank_lines_expense_id_fk')->references(['id'])->on('core_expenses')->onDelete('restrict')->onUpdate('cascade');
            });
        }
        if (in_array('zakat_academy_profiles', $created, true)) {
            Schema::table('zakat_academy_profiles', function (Blueprint $table): void {
                $table->foreign(['user_id'], 'zakat_academy_profiles_user_id_fk')->references(['id'])->on('users')->onDelete('restrict')->onUpdate('cascade');
            });
        }
        if (in_array('zakat_academy_chapters', $created, true)) {
            Schema::table('zakat_academy_chapters', function (Blueprint $table): void {
                $table->foreign(['course_id'], 'zakat_academy_chapters_course_id_fk')->references(['id'])->on('zakat_academy_courses')->onDelete('cascade')->onUpdate('cascade');
            });
        }
        if (in_array('zakat_academy_lessons', $created, true)) {
            Schema::table('zakat_academy_lessons', function (Blueprint $table): void {
                $table->foreign(['chapter_id'], 'zakat_academy_lessons_chapter_id_fk')->references(['id'])->on('zakat_academy_chapters')->onDelete('cascade')->onUpdate('cascade');
            });
        }
        if (in_array('zakat_academy_lesson_attachments', $created, true)) {
            Schema::table('zakat_academy_lesson_attachments', function (Blueprint $table): void {
                $table->foreign(['lesson_id'], 'zakat_academy_lesson_attachmen_lesson_id_fk')->references(['id'])->on('zakat_academy_lessons')->onDelete('cascade')->onUpdate('cascade');
            });
        }
        if (in_array('zakat_academy_enrollments', $created, true)) {
            Schema::table('zakat_academy_enrollments', function (Blueprint $table): void {
                $table->foreign(['profile_id'], 'zakat_academy_enrollments_profile_id_fk')->references(['id'])->on('zakat_academy_profiles')->onDelete('restrict')->onUpdate('cascade');
                $table->foreign(['course_id'], 'zakat_academy_enrollments_course_id_fk')->references(['id'])->on('zakat_academy_courses')->onDelete('restrict')->onUpdate('cascade');
            });
        }
        if (in_array('zakat_academy_lesson_progress', $created, true)) {
            Schema::table('zakat_academy_lesson_progress', function (Blueprint $table): void {
                $table->foreign(['profile_id'], 'zakat_academy_lesson_progress_profile_id_fk')->references(['id'])->on('zakat_academy_profiles')->onDelete('restrict')->onUpdate('cascade');
                $table->foreign(['lesson_id'], 'zakat_academy_lesson_progress_lesson_id_fk')->references(['id'])->on('zakat_academy_lessons')->onDelete('restrict')->onUpdate('cascade');
            });
        }
        if (in_array('zakat_academy_quizzes', $created, true)) {
            Schema::table('zakat_academy_quizzes', function (Blueprint $table): void {
                $table->foreign(['chapter_id'], 'zakat_academy_quizzes_chapter_id_fk')->references(['id'])->on('zakat_academy_chapters')->onDelete('cascade')->onUpdate('cascade');
            });
        }
        if (in_array('zakat_academy_quiz_questions', $created, true)) {
            Schema::table('zakat_academy_quiz_questions', function (Blueprint $table): void {
                $table->foreign(['quiz_id'], 'zakat_academy_quiz_questions_quiz_id_fk')->references(['id'])->on('zakat_academy_quizzes')->onDelete('cascade')->onUpdate('cascade');
            });
        }
        if (in_array('academy_notification_reads', $created, true)) {
            Schema::table('academy_notification_reads', function (Blueprint $table): void {
                $table->foreign(['profile_id'], 'academy_notification_reads_profile_id_fk')->references(['id'])->on('zakat_academy_profiles')->onDelete('cascade')->onUpdate('cascade');
            });
        }
        if (in_array('academy_study_notes', $created, true)) {
            Schema::table('academy_study_notes', function (Blueprint $table): void {
                $table->foreign(['profile_id'], 'academy_study_notes_profile_id_fk')->references(['id'])->on('zakat_academy_profiles')->onDelete('cascade')->onUpdate('cascade');
                $table->foreign(['lesson_id'], 'academy_study_notes_lesson_id_fk')->references(['id'])->on('zakat_academy_lessons')->onDelete('cascade')->onUpdate('cascade');
            });
        }
        if (in_array('academy_live_sessions', $created, true)) {
            Schema::table('academy_live_sessions', function (Blueprint $table): void {
                $table->foreign(['course_id'], 'academy_live_sessions_course_id_fk')->references(['id'])->on('zakat_academy_courses')->onDelete('cascade')->onUpdate('cascade');
            });
        }
        if (in_array('academy_discussions', $created, true)) {
            Schema::table('academy_discussions', function (Blueprint $table): void {
                $table->foreign(['profile_id'], 'academy_discussions_profile_id_fk')->references(['id'])->on('zakat_academy_profiles')->onDelete('restrict')->onUpdate('cascade');
                $table->foreign(['course_id'], 'academy_discussions_course_id_fk')->references(['id'])->on('zakat_academy_courses')->onDelete('restrict')->onUpdate('cascade');
            });
        }
        if (in_array('zakat_academy_quiz_options', $created, true)) {
            Schema::table('zakat_academy_quiz_options', function (Blueprint $table): void {
                $table->foreign(['question_id'], 'zakat_academy_quiz_options_question_id_fk')->references(['id'])->on('zakat_academy_quiz_questions')->onDelete('cascade')->onUpdate('cascade');
            });
        }
        if (in_array('zakat_academy_quiz_attempts', $created, true)) {
            Schema::table('zakat_academy_quiz_attempts', function (Blueprint $table): void {
                $table->foreign(['profile_id'], 'zakat_academy_quiz_attempts_profile_id_fk')->references(['id'])->on('zakat_academy_profiles')->onDelete('restrict')->onUpdate('cascade');
                $table->foreign(['quiz_id'], 'zakat_academy_quiz_attempts_quiz_id_fk')->references(['id'])->on('zakat_academy_quizzes')->onDelete('restrict')->onUpdate('cascade');
            });
        }
        if (in_array('zakat_academy_completion_records', $created, true)) {
            Schema::table('zakat_academy_completion_records', function (Blueprint $table): void {
                $table->foreign(['profile_id'], 'zakat_academy_completion_recor_profile_id_fk')->references(['id'])->on('zakat_academy_profiles')->onDelete('restrict')->onUpdate('cascade');
                $table->foreign(['course_id'], 'zakat_academy_completion_recor_course_id_fk')->references(['id'])->on('zakat_academy_courses')->onDelete('restrict')->onUpdate('cascade');
            });
        }
        if (in_array('lazsip_program_applicants', $created, true)) {
            Schema::table('lazsip_program_applicants', function (Blueprint $table): void {
                $table->foreign(['program_id'], 'lazsip_program_applicants_program_id_fk')->references(['id'])->on('lazsip_programs')->onDelete('cascade')->onUpdate('cascade');
            });
        }
        if (in_array('lazsip_campaign_adjustments', $created, true)) {
            Schema::table('lazsip_campaign_adjustments', function (Blueprint $table): void {
                $table->foreign(['campaign_id'], 'lazsip_campaign_adjustments_campaign_id_fk')->references(['id'])->on('lazsip_campaigns')->onDelete('cascade')->onUpdate('cascade');
            });
        }
        if (in_array('lazsip_donations', $created, true)) {
            Schema::table('lazsip_donations', function (Blueprint $table): void {
                $table->foreign(['campaign_id'], 'lazsip_donations_campaign_id_fk')->references(['id'])->on('lazsip_campaigns')->onDelete('cascade')->onUpdate('cascade');
                $table->foreign(['donor_id'], 'lazsip_donations_donor_id_fk')->references(['id'])->on('payment_donors')->onDelete('restrict')->onUpdate('cascade');
            });
        }
        if (in_array('lazsip_zakat_payments', $created, true)) {
            Schema::table('lazsip_zakat_payments', function (Blueprint $table): void {
                $table->foreign(['donor_id'], 'lazsip_zakat_payments_donor_id_fk')->references(['id'])->on('payment_donors')->onDelete('restrict')->onUpdate('cascade');
            });
        }
        if (in_array('ojol_members', $created, true)) {
            Schema::table('ojol_members', function (Blueprint $table): void {
                $table->foreign(['user_id'], 'ojol_members_user_id_fk')->references(['id'])->on('users')->onDelete('cascade')->onUpdate('cascade');
                $table->foreign(['group_id'], 'ojol_members_group_id_fk')->references(['id'])->on('ojol_groups')->onDelete('set null')->onUpdate('cascade');
            });
        }
        if (in_array('ojol_tasks', $created, true)) {
            Schema::table('ojol_tasks', function (Blueprint $table): void {
                $table->foreign(['teacher_id'], 'ojol_tasks_teacher_id_fk')->references(['id'])->on('ojol_members')->onDelete('set null')->onUpdate('cascade');
            });
        }
        if (in_array('ojol_task_groups', $created, true)) {
            Schema::table('ojol_task_groups', function (Blueprint $table): void {
                $table->foreign(['task_id'], 'ojol_task_groups_task_id_fk')->references(['id'])->on('ojol_tasks')->onDelete('cascade')->onUpdate('cascade');
                $table->foreign(['group_id'], 'ojol_task_groups_group_id_fk')->references(['id'])->on('ojol_groups')->onDelete('cascade')->onUpdate('cascade');
            });
        }
        if (in_array('ojol_quiz_questions', $created, true)) {
            Schema::table('ojol_quiz_questions', function (Blueprint $table): void {
                $table->foreign(['task_id'], 'ojol_quiz_questions_task_id_fk')->references(['id'])->on('ojol_tasks')->onDelete('cascade')->onUpdate('cascade');
            });
        }
        if (in_array('ojol_submissions', $created, true)) {
            Schema::table('ojol_submissions', function (Blueprint $table): void {
                $table->foreign(['task_id'], 'ojol_submissions_task_id_fk')->references(['id'])->on('ojol_tasks')->onDelete('cascade')->onUpdate('cascade');
                $table->foreign(['student_id'], 'ojol_submissions_student_id_fk')->references(['id'])->on('ojol_members')->onDelete('cascade')->onUpdate('cascade');
            });
        }
        if (in_array('ojol_submission_logs', $created, true)) {
            Schema::table('ojol_submission_logs', function (Blueprint $table): void {
                $table->foreign(['submission_id'], 'ojol_submission_logs_submission_id_fk')->references(['id'])->on('ojol_submissions')->onDelete('cascade')->onUpdate('cascade');
                $table->foreign(['reviewer_id'], 'ojol_submission_logs_reviewer_id_fk')->references(['id'])->on('ojol_members')->onDelete('set null')->onUpdate('cascade');
            });
        }
        if (in_array('ojol_quiz_answers', $created, true)) {
            Schema::table('ojol_quiz_answers', function (Blueprint $table): void {
                $table->foreign(['submission_id'], 'ojol_quiz_answers_submission_id_fk')->references(['id'])->on('ojol_submissions')->onDelete('cascade')->onUpdate('cascade');
                $table->foreign(['question_id'], 'ojol_quiz_answers_question_id_fk')->references(['id'])->on('ojol_quiz_questions')->onDelete('cascade')->onUpdate('cascade');
            });
        }
        if (in_array('ojol_task_approvers', $created, true)) {
            Schema::table('ojol_task_approvers', function (Blueprint $table): void {
                $table->foreign(['task_id'], 'ojol_task_approvers_task_id_fk')->references(['id'])->on('ojol_tasks')->onDelete('cascade')->onUpdate('cascade');
                $table->foreign(['teacher_id'], 'ojol_task_approvers_teacher_id_fk')->references(['id'])->on('ojol_members')->onDelete('cascade')->onUpdate('cascade');
            });
        }
        if (in_array('payment_transactions', $created, true)) {
            Schema::table('payment_transactions', function (Blueprint $table): void {
                $table->foreign(['destination_account_id'], 'payment_transactions_destination_account__fk')->references(['id'])->on('payment_destination_accounts')->onDelete('restrict')->onUpdate('cascade');
                $table->foreign(['donor_id'], 'payment_transactions_donor_id_fk')->references(['id'])->on('payment_donors')->onDelete('restrict')->onUpdate('cascade');
            });
        }
        if (in_array('payment_receipts', $created, true)) {
            Schema::table('payment_receipts', function (Blueprint $table): void {
                $table->foreign(['transaction_id'], 'payment_receipts_transaction_id_fk')->references(['id'])->on('payment_transactions')->onDelete('cascade')->onUpdate('cascade');
            });
        }
        if (in_array('tanwir_members', $created, true)) {
            Schema::table('tanwir_members', function (Blueprint $table): void {
                $table->foreign(['user_id'], 'tanwir_members_user_id_fk')->references(['id'])->on('users')->onDelete('cascade')->onUpdate('cascade');
                $table->foreign(['group_id'], 'tanwir_members_group_id_fk')->references(['id'])->on('tanwir_groups')->onDelete('set null')->onUpdate('cascade');
            });
        }
        if (in_array('tanwir_groups', $created, true)) {
            Schema::table('tanwir_groups', function (Blueprint $table): void {
                $table->foreign(['pic_id'], 'tanwir_groups_pic_id_fk')->references(['id'])->on('tanwir_members')->onDelete('set null')->onUpdate('cascade');
            });
        }
        if (in_array('tanwir_tasks', $created, true)) {
            Schema::table('tanwir_tasks', function (Blueprint $table): void {
                $table->foreign(['teacher_id'], 'tanwir_tasks_teacher_id_fk')->references(['id'])->on('tanwir_members')->onDelete('set null')->onUpdate('cascade');
            });
        }
        if (in_array('tanwir_task_groups', $created, true)) {
            Schema::table('tanwir_task_groups', function (Blueprint $table): void {
                $table->foreign(['task_id'], 'tanwir_task_groups_task_id_fk')->references(['id'])->on('tanwir_tasks')->onDelete('cascade')->onUpdate('cascade');
                $table->foreign(['group_id'], 'tanwir_task_groups_group_id_fk')->references(['id'])->on('tanwir_groups')->onDelete('cascade')->onUpdate('cascade');
            });
        }
        if (in_array('tanwir_quiz_questions', $created, true)) {
            Schema::table('tanwir_quiz_questions', function (Blueprint $table): void {
                $table->foreign(['task_id'], 'tanwir_quiz_questions_task_id_fk')->references(['id'])->on('tanwir_tasks')->onDelete('cascade')->onUpdate('cascade');
            });
        }
        if (in_array('tanwir_submissions', $created, true)) {
            Schema::table('tanwir_submissions', function (Blueprint $table): void {
                $table->foreign(['task_id'], 'tanwir_submissions_task_id_fk')->references(['id'])->on('tanwir_tasks')->onDelete('cascade')->onUpdate('cascade');
                $table->foreign(['student_id'], 'tanwir_submissions_student_id_fk')->references(['id'])->on('tanwir_members')->onDelete('cascade')->onUpdate('cascade');
            });
        }
        if (in_array('tanwir_submission_logs', $created, true)) {
            Schema::table('tanwir_submission_logs', function (Blueprint $table): void {
                $table->foreign(['submission_id'], 'tanwir_submission_logs_submission_id_fk')->references(['id'])->on('tanwir_submissions')->onDelete('cascade')->onUpdate('cascade');
                $table->foreign(['reviewer_id'], 'tanwir_submission_logs_reviewer_id_fk')->references(['id'])->on('tanwir_members')->onDelete('set null')->onUpdate('cascade');
            });
        }
        if (in_array('tanwir_quiz_answers', $created, true)) {
            Schema::table('tanwir_quiz_answers', function (Blueprint $table): void {
                $table->foreign(['submission_id'], 'tanwir_quiz_answers_submission_id_fk')->references(['id'])->on('tanwir_submissions')->onDelete('cascade')->onUpdate('cascade');
                $table->foreign(['question_id'], 'tanwir_quiz_answers_question_id_fk')->references(['id'])->on('tanwir_quiz_questions')->onDelete('cascade')->onUpdate('cascade');
            });
        }
        if (in_array('tanwir_students', $created, true)) {
            Schema::table('tanwir_students', function (Blueprint $table): void {
                $table->foreign(['member_id'], 'tanwir_students_member_id_fk')->references(['id'])->on('tanwir_members')->onDelete('cascade')->onUpdate('cascade');
            });
        }
        if (in_array('teknisi_participants', $created, true)) {
            Schema::table('teknisi_participants', function (Blueprint $table): void {
                $table->foreign(['userId'], 'teknisi_participants_userId_fk')->references(['id'])->on('users')->onDelete('restrict')->onUpdate('cascade');
            });
        }
        if (in_array('teknisi_technicians', $created, true)) {
            Schema::table('teknisi_technicians', function (Blueprint $table): void {
                $table->foreign(['outletId'], 'teknisi_technicians_outletId_fk')->references(['id'])->on('teknisi_outlets')->onDelete('restrict')->onUpdate('cascade');
            });
        }
        if (in_array('teknisi_tickets', $created, true)) {
            Schema::table('teknisi_tickets', function (Blueprint $table): void {
                $table->foreign(['outletId'], 'teknisi_tickets_outletId_fk')->references(['id'])->on('teknisi_outlets')->onDelete('restrict')->onUpdate('cascade');
                $table->foreign(['technicianId'], 'teknisi_tickets_technicianId_fk')->references(['id'])->on('teknisi_technicians')->onDelete('set null')->onUpdate('cascade');
                $table->foreign(['participantId'], 'teknisi_tickets_participantId_fk')->references(['id'])->on('teknisi_participants')->onDelete('set null')->onUpdate('cascade');
            });
        }
        if (in_array('teknisi_events', $created, true)) {
            Schema::table('teknisi_events', function (Blueprint $table): void {
                $table->foreign(['ticketId'], 'teknisi_events_ticketId_fk')->references(['id'])->on('teknisi_tickets')->onDelete('restrict')->onUpdate('cascade');
            });
        }
        if (in_array('teknisi_parts', $created, true)) {
            Schema::table('teknisi_parts', function (Blueprint $table): void {
                $table->foreign(['outletId'], 'teknisi_parts_outletId_fk')->references(['id'])->on('teknisi_outlets')->onDelete('restrict')->onUpdate('cascade');
            });
        }
        if (in_array('teknisi_part_uses', $created, true)) {
            Schema::table('teknisi_part_uses', function (Blueprint $table): void {
                $table->foreign(['ticketId'], 'teknisi_part_uses_ticketId_fk')->references(['id'])->on('teknisi_tickets')->onDelete('restrict')->onUpdate('cascade');
                $table->foreign(['partId'], 'teknisi_part_uses_partId_fk')->references(['id'])->on('teknisi_parts')->onDelete('restrict')->onUpdate('cascade');
            });
        }
        if (in_array('teknisi_stock_movements', $created, true)) {
            Schema::table('teknisi_stock_movements', function (Blueprint $table): void {
                $table->foreign(['partId'], 'teknisi_stock_movements_partId_fk')->references(['id'])->on('teknisi_parts')->onDelete('restrict')->onUpdate('cascade');
            });
        }
    }

    public function down(): void
    {
        throw new LogicException('Existing module tables are shared data; destructive rollback is disabled.');
    }
};
