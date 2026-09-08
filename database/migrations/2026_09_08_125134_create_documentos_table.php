<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documentos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('expediente_id')->constrained('expedientes')->cascadeOnDelete();
            $table->string('nombre_original');
            $table->string('ruta');
            $table->string('mime')->nullable();
            $table->unsignedBigInteger('tamano')->default(0);
            $table->string('tipo_detectado', 64)->nullable();
            $table->decimal('confianza', 5, 2)->nullable();
            $table->longText('texto_extraido')->nullable();
            $table->json('datos_extraidos')->nullable();
            $table->string('estado', 32)->default('subido');
            $table->text('nota_ia')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documentos');
    }
};
