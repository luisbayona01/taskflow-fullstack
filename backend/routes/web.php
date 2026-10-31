<?php

use App\Http\Controllers\ApiIndexController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| The main path of the backend ("/") publishes the catalogue of the API
| routes (HTML or JSON) and links to the Swagger UI. The Swagger UI itself
| is served from "/documentation" and the OpenAPI JSON from "/docs".
|
*/

Route::get('/', [ApiIndexController::class, 'index'])->name('api.index');
Route::get('/api', [ApiIndexController::class, 'index'])->name('api.index.json');
Route::redirect('/swagger', '/documentation')->name('api.swagger');
