<?php

namespace App\Support;

use App\Support\LearningControllers\DashboardController;
use App\Support\LearningControllers\GroupController;
use App\Support\LearningControllers\MemberController;
use App\Support\LearningControllers\RegionController;
use App\Support\LearningControllers\StudentController;
use App\Support\LearningControllers\SubmissionController;
use App\Support\LearningControllers\TaskController;
use Illuminate\Support\Facades\Route;

class LearningRoutes
{
    public static function register(string $module): void
    {
        if (! in_array($module, ['tanwir', 'ojol'], true)) {
            throw new \LogicException('Unknown learning module.');
        }
        Route::middleware(['auth:sanctum', 'user.active'])->group(function () use ($module): void {
            $routes = [
                ['get', 'members', MemberController::class, 'index'], ['get', 'members/{id}', MemberController::class, 'show'],
                ['post', 'members', MemberController::class, 'store'], ['put', 'members/{id}', MemberController::class, 'update'],
                ['put', 'members/{id}/status', MemberController::class, 'status'], ['delete', 'members/{id}', MemberController::class, 'destroy'],
                ['get', 'profile', MemberController::class, 'profile'], ['put', 'profile', MemberController::class, 'updateProfile'], ['put', 'profile/password', MemberController::class, 'password'],
                ['get', 'groups/options', GroupController::class, 'options'], ['get', 'teachers/options', GroupController::class, 'teachers'],
                ['get', 'groups', GroupController::class, 'index'], ['get', 'groups/{id}', GroupController::class, 'show'],
                ['post', 'groups', GroupController::class, 'store'], ['put', 'groups/{id}', GroupController::class, 'update'], ['delete', 'groups/{id}', GroupController::class, 'destroy'],
                ['get', 'student/group', GroupController::class, 'studentGroup'],
                ['get', 'tasks', TaskController::class, 'teacherList'], ['get', 'tasks/{id}', TaskController::class, 'teacherShow'],
                ['get', 'admin/tasks', TaskController::class, 'adminList'], ['post', 'tasks', TaskController::class, 'store'],
                ['put', 'tasks/{id}', TaskController::class, 'update'], ['delete', 'tasks/{id}', TaskController::class, 'destroy'],
                ['post', 'tasks/{id}/extensions', TaskController::class, 'extend'],
                ['get', 'student/tasks', TaskController::class, 'studentList'], ['get', 'student/tasks/{id}', TaskController::class, 'studentShow'],
                ['post', 'tasks/{id}/quiz-attempts', SubmissionController::class, 'quiz'], ['post', 'submissions', SubmissionController::class, 'media'],
                ['get', 'review-queue', SubmissionController::class, 'queue'], ['get', 'submissions/{id}', SubmissionController::class, 'show'],
                ['post', 'submissions/{id}/reviews', SubmissionController::class, 'review'], ['get', 'tasks/{id}/results', SubmissionController::class, 'results'],
                ['get', 'files/submission/{id}', SubmissionController::class, 'file'], ['get', 'files/photo/{id}', SubmissionController::class, 'photo'],
                ['get', 'dashboard/admin', DashboardController::class, 'admin'], ['get', 'dashboard/map', DashboardController::class, 'map'],
                ['get', 'dashboard/recent', DashboardController::class, 'recent'], ['get', 'dashboard/teacher', DashboardController::class, 'teacher'],
            ];
            if ($module === 'tanwir') {
                $routes = [...$routes,
                    ['get', 'students/owners', StudentController::class, 'owners'], ['get', 'students', StudentController::class, 'index'],
                    ['get', 'students/{id}', StudentController::class, 'show'], ['post', 'students', StudentController::class, 'store'],
                    ['put', 'students/{id}', StudentController::class, 'update'], ['delete', 'students/{id}', StudentController::class, 'destroy'],
                ];
            }
            foreach ($routes as [$method, $path, $controller, $action]) {
                Route::$method($path, [$controller, $action])->defaults('learningModule', $module);
            }
            Route::get('wilayah/{level}', RegionController::class)->defaults('learningModule', $module);
        });
    }
}
