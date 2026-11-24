<?php

use App\Modules\Rapat\Http\RapatController as C;
use Illuminate\Support\Facades\Route;

Route::get('viewer', [C::class, 'viewer']);
Route::get('settings', [C::class, 'retired']);
Route::put('settings', [C::class, 'retired']);
Route::get('meetings', [C::class, 'index']);
Route::post('meetings', [C::class, 'store']);
Route::get('meetings/{id}', [C::class, 'show']);
Route::put('meetings/{id}', [C::class, 'update']);
Route::post('meetings/{id}/media', [C::class, 'upload']);
Route::get('media/{id}', [C::class, 'play']);
Route::delete('media/{id}', [C::class, 'removeMedia']);
Route::post('meetings/{id}/transcribe', [C::class, 'transcribe']);
Route::post('meetings/{id}/generate', [C::class, 'retired']);
Route::post('meetings/{id}/archive', [C::class, 'archive']);
Route::get('meetings/{id}/docx', [C::class, 'retired']);

Route::get('ai/status', [C::class, 'aiStatus']);
Route::get('tasks', [C::class, 'retired']);
Route::get('meetings/{id}/history', [C::class, 'retired']);
Route::post('meetings/{id}/finalize', [C::class, 'retired']);
Route::put('meetings/{id}/actions/{index}', [C::class, 'retired']);
Route::get('meetings/{id}/attachments', [C::class, 'retired']);
Route::post('meetings/{id}/attachments', [C::class, 'retired']);
Route::get('attachments/{id}', [C::class, 'retired']);
Route::delete('attachments/{id}', [C::class, 'retired']);
