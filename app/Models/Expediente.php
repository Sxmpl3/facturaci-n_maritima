<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Expediente extends Model
{
    protected $table = 'expedientes';

    protected $guarded = [];

    protected $casts = [
        'validado_en' => 'datetime',
    ];

    public const ESTADOS = [
        'borrador'   => 'Borrador',
        'analizando' => 'Analizando IA',
        'revision'   => 'En revisión',
        'validado'   => 'Validado',
    ];

    public function documentos(): HasMany
    {
        return $this->hasMany(Documento::class);
    }

    public function declaracion(): HasOne
    {
        return $this->hasOne(Declaracion::class);
    }

    public function historial(): HasMany
    {
        return $this->hasMany(HistorialEvento::class)->latest();
    }

    public function creador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creado_por');
    }

    public function validador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validado_por');
    }
}
