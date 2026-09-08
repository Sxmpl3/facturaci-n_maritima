<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Declaracion extends Model
{
    protected $table = 'declaraciones';

    protected $guarded = [];

    protected $casts = [
        'datos'          => 'array',
        'advertencias'   => 'array',
        'confianza_global' => 'float',
        'generado_en'    => 'datetime',
    ];

    public function expediente(): BelongsTo
    {
        return $this->belongsTo(Expediente::class);
    }
}
