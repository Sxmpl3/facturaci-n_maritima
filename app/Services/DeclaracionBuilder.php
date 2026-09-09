<?php

namespace App\Services;

use App\Models\Declaracion;
use App\Models\Expediente;

class DeclaracionBuilder
{
    public function __construct(protected OpenAIService $openai) {}

    public function construir(Expediente $expediente): Declaracion
    {
        $expediente->loadMissing('documentos');

        $porTipo = $expediente->documentos->groupBy('tipo_detectado')->map(function ($grupo) {
            return $grupo->map(fn ($d) => [
                'archivo'         => $d->nombre_original,
                'confianza'       => $d->confianza,
                'resumen'         => $d->nota_ia,
                'datos_extraidos' => $d->datos_extraidos ?? [],
            ])->values();
        });

        $mensajes = [
            [
                'role'    => 'system',
                'content' => <<<'SYS'
                Eres el motor de consolidación de Wixia para declaraciones de tránsito NCTS (T1/T2/T2F/TIR).
                Recibes los datos ya extraídos de todos los documentos del expediente (facturas, CMR, B/L, certificados, ICS2 o incluso una declaración T1/T2 ya emitida).
                Tu trabajo es fusionar la información en una ÚNICA declaración de tránsito coherente, resolviendo conflictos y priorizando:
                - Declaración de tránsito emitida (si viene) → MRN, LRN, tipo_declaracion, aduanas, titular del régimen (=declarante), garantía, precintos.
                - CMR y B/L → transportista, matrícula, aduanas, medio de transporte.
                - Factura comercial → expedidor, consignatario, valor, moneda, incoterm, mercancías, códigos HS.
                - Packing list → pesos, bultos, cantidades.
                - Certificados → mercancías especiales, país de origen.

                REGLAS DE MAPEO ESTRICTAS:
                · 'titular_regimen' (holder of the transit procedure) del documento fuente → 'declarante' (nombre y EORI) en la declaración final.
                · 'garantia_referencia' de un T1/T2 emitido → 'garantia.referencia' (mantén el código GRN si aparece).
                · 'precintos' → añádelos a 'observaciones' o al campo dedicado si existe.
                · Si el documento ya trae LRN/MRN, cópialos tal cual, no los generes.
                · EORI se conserva con formato completo (letras+dígitos, ej. ESB72145238).

                NÚMEROS EUROPEOS: en aduanas ES/UE el separador de miles es '.' y el decimal ','.
                '22.153,00' = 22153.0 · '1.500,50' = 1500.5 · '15.355' (sin coma) suele ser 15355 entero.
                Nunca conviertas '22.153' a 22.153: eso serían 22 gramos de mercancía, incoherente para tránsito.

                Nunca inventes datos. Si un campo falta en TODOS los documentos, déjalo vacío y añade una advertencia clara.
                Estima una confianza global (0-100) según la cobertura y coherencia de los datos.
                Trabaja en español.
                SYS,
            ],
            [
                'role'    => 'user',
                'content' => "Referencia expediente: {$expediente->referencia}\n\nDATOS EXTRAÍDOS POR DOCUMENTO:\n".json_encode($porTipo, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
            ],
        ];

        $schema = $this->schemaDeclaracion();
        $resultado = $this->openai->json($mensajes, $schema);

        $declaracion = Declaracion::updateOrCreate(
            ['expediente_id' => $expediente->id],
            [
                'tipo'             => 'transito',
                'estado'           => 'propuesta',
                'datos'            => $resultado['datos'] ?? [],
                'advertencias'     => $resultado['advertencias'] ?? [],
                'confianza_global' => (float) ($resultado['confianza_global'] ?? 0),
                'generado_en'      => now(),
            ]
        );

        // Actualizar cabecera del expediente con campos clave si vienen
        $datos = $resultado['datos'] ?? [];
        $expediente->update([
            'estado'          => 'revision',
            'cliente'         => data_get($datos, 'expedidor.nombre') ?: $expediente->cliente,
            'mrn'             => data_get($datos, 'mrn') ?: $expediente->mrn,
            'aduana_partida'  => data_get($datos, 'aduana_partida') ?: $expediente->aduana_partida,
            'aduana_destino'  => data_get($datos, 'aduana_destino') ?: $expediente->aduana_destino,
        ]);

        return $declaracion;
    }

    protected function schemaDeclaracion(): array
    {
        $s = ['type' => ['string', 'null']];
        $n = ['type' => ['number', 'null']];

        $entidad = [
            'type' => 'object',
            'additionalProperties' => false,
            'properties' => [
                'nombre'    => $s,
                'direccion' => $s,
                'ciudad'    => $s,
                'cp'        => $s,
                'pais'      => $s,
                'eori'      => $s,
            ],
            'required' => ['nombre','direccion','ciudad','cp','pais','eori'],
        ];

        $mercancia = [
            'type' => 'object',
            'additionalProperties' => false,
            'properties' => [
                'partida'      => $n,
                'descripcion'  => $s,
                'codigo_hs'    => $s,
                'cantidad'     => $n,
                'unidad'       => $s,
                'peso_bruto_kg'=> $n,
                'peso_neto_kg' => $n,
                'valor'        => $n,
                'moneda'       => $s,
                'pais_origen'  => $s,
                'bultos'       => $n,
                'marcas'       => $s,
            ],
            'required' => ['partida','descripcion','codigo_hs','cantidad','unidad','peso_bruto_kg','peso_neto_kg','valor','moneda','pais_origen','bultos','marcas'],
        ];

        $documentoRef = [
            'type' => 'object',
            'additionalProperties' => false,
            'properties' => [
                'tipo'      => $s,
                'referencia'=> $s,
                'fecha'     => $s,
            ],
            'required' => ['tipo','referencia','fecha'],
        ];

        return [
            'type' => 'object',
            'additionalProperties' => false,
            'properties' => [
                'confianza_global' => ['type' => 'number', 'minimum' => 0, 'maximum' => 100],
                'advertencias'     => ['type' => 'array', 'items' => ['type' => 'string']],
                'datos' => [
                    'type' => 'object',
                    'additionalProperties' => false,
                    'properties' => [
                        'tipo_declaracion'   => ['type' => 'string', 'enum' => ['T1','T2','T2F','TIR','']],
                        'mrn'                => $s,
                        'lrn'                => $s,
                        'aduana_partida'     => $s,
                        'aduana_destino'     => $s,
                        'aduana_paso'        => $s,
                        'expedidor'          => $entidad,
                        'consignatario'      => $entidad,
                        'declarante'         => $entidad,
                        'transporte' => [
                            'type' => 'object',
                            'additionalProperties' => false,
                            'properties' => [
                                'modo'          => $s,
                                'identificacion'=> $s,
                                'nacionalidad'  => $s,
                                'contenedores'  => ['type' => 'array', 'items' => ['type' => 'string']],
                            ],
                            'required' => ['modo','identificacion','nacionalidad','contenedores'],
                        ],
                        'garantia' => [
                            'type' => 'object',
                            'additionalProperties' => false,
                            'properties' => [
                                'tipo'      => $s,
                                'referencia'=> $s,
                                'importe'   => $n,
                            ],
                            'required' => ['tipo','referencia','importe'],
                        ],
                        'moneda'          => $s,
                        'valor_total'     => $n,
                        'peso_bruto_total'=> $n,
                        'bultos_totales'  => $n,
                        'incoterm'        => $s,
                        'lugar_carga'     => $s,
                        'lugar_descarga'  => $s,
                        'itinerario'      => ['type' => 'array', 'items' => ['type' => 'string']],
                        'mercancias'      => ['type' => 'array', 'items' => $mercancia],
                        'documentos'      => ['type' => 'array', 'items' => $documentoRef],
                        'observaciones'   => $s,
                    ],
                    'required' => [
                        'tipo_declaracion','mrn','lrn','aduana_partida','aduana_destino','aduana_paso',
                        'expedidor','consignatario','declarante','transporte','garantia',
                        'moneda','valor_total','peso_bruto_total','bultos_totales','incoterm',
                        'lugar_carga','lugar_descarga','itinerario','mercancias','documentos','observaciones',
                    ],
                ],
            ],
            'required' => ['confianza_global','advertencias','datos'],
        ];
    }
}
