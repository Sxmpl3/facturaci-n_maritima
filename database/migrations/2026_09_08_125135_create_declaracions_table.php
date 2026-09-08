<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('declaraciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('expediente_id')->constrained('expedientes')->cascadeOnDelete();
            $table->string('tipo', 32)->default('transito');
            $table->string('estado', 32)->default('borrador');
            $table->json('datos');
            $table->json('advertencias')->nullable();
            $table->decimal('confianza_global', 5, 2)->nullable();
            $table->timestamp('generado_en')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('declaraciones');
    }
};
