<?php

use App\Modules\Rapat\Http\AttachmentController as A;
use App\Modules\Rapat\Http\RapatController as C;
use Illuminate\Support\Facades\Route;

Route::get('viewer', [C::class, 'viewer']);
Route::get('settings', [C::class, 'settings']);
Route::put('settings', [C::class, 'saveSettings']);
Route::get('meetings', [C::class, 'index']);
Route::post('meetings', [C::class, 'store']);
Route::get('meetings/{id}', [C::class, 'show']);
Route::put('meetings/{id}', [C::class, 'update']);
Route::post('meetings/{id}/media', [C::class, 'upload']);
Route::get('media/{id}', [C::class, 'play']);
Route::delete('media/{id}', [C::class, 'removeMedia']);
Route::post('meetings/{id}/transcribe', [C::class, 'transcribe']);
Route::post('meetings/{id}/generate', [C::class, 'generate']);
Route::post('meetings/{id}/archive', [C::class, 'archive']);
Route::get('meetings/{id}/docx', [C::class, 'docx']);

Route::get('ai/status', [C::class, 'aiStatus']);
Route::get('tasks', [C::class, 'tasks']);
Route::get('meetings/{id}/history', [C::class, 'history']);
Route::post('meetings/{id}/finalize', [C::class, 'finalize']);
Route::put('meetings/{id}/actions/{index}', [C::class, 'actionStatus']);
Route::get('meetings/{id}/attachments', [A::class, 'index']);
Route::post('meetings/{id}/attachments', [A::class, 'store']);
Route::get('attachments/{id}', [A::class, 'show']);
Route::delete('attachments/{id}', [A::class, 'destroy']);
