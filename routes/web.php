<?php

use App\Http\Controllers\DocumentoController;
use App\Http\Controllers\ExpedienteController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect(auth()->check() ? '/transito' : '/login');
})->name('home');

Route::middleware(['auth'])->group(function () {
    Route::redirect('dashboard', '/transito')->name('dashboard');

    Route::prefix('transito')->name('transito.')->group(function () {
        Route::get('/', [ExpedienteController::class, 'index'])->name('index');
        Route::get('nuevo', [ExpedienteController::class, 'create'])->name('create');
        Route::post('/', [ExpedienteController::class, 'store'])->name('store');
        Route::get('{expediente}', [ExpedienteController::class, 'show'])->name('show');

        Route::post('{expediente}/documentos', [DocumentoController::class, 'store'])->name('documentos.store');
        Route::get('{expediente}/documentos/{documento}/ver', [DocumentoController::class, 'ver'])->name('documentos.ver');
        Route::delete('{expediente}/documentos/{documento}', [DocumentoController::class, 'destroy'])->name('documentos.destroy');
        Route::post('{expediente}/analizar', [DocumentoController::class, 'analizar'])->name('analizar');

        Route::patch('{expediente}/declaracion', [ExpedienteController::class, 'actualizarDeclaracion'])->name('declaracion.update');
        Route::post('{expediente}/validar', [ExpedienteController::class, 'validar'])->name('validar');
    });
});

require __DIR__.'/settings.php';
