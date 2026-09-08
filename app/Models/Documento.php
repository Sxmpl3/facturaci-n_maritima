<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class Documento extends Model
{
    protected $table = 'documentos';

    protected $guarded = [];

    protected $casts = [
        'datos_extraidos' => 'array',
        'confianza'       => 'float',
    ];

    public const TIPOS = [
        'factura_comercial'         => 'Factura comercial',
        'cmr'                       => 'CMR',
        'conocimiento_embarque'     => 'Conocimiento de embarque',
        'certificado_fitosanitario' => 'Certificado fitosanitario',
        'certificado_conformidad'   => 'Certificado de conformidad',
        'ics2'                      => 'ICS2',
        'packing_list'              => 'Packing list',
        'otro'                      => 'Documentación complementaria',
    ];

    public function expediente(): BelongsTo
    {
        return $this->belongsTo(Expediente::class);
    }

    public function getUrlAttribute(): ?string
    {
        return $this->ruta ? Storage::url($this->ruta) : null;
    }
}
