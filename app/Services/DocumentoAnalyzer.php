<?php

namespace App\Services;

use App\Models\Documento;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class DocumentoAnalyzer
{
    public function __construct(protected OpenAIService $openai) {}

    /**
     * Analiza un documento: extrae texto, clasifica y estructura datos.
     */
    public function analizar(Documento $documento): void
    {
        $documento->update(['estado' => 'analizando']);

        $extraido = $this->extraerContenido($documento);

        $mensajes = [
            [
                'role'    => 'system',
                'content' => <<<'SYS'
                Eres un asistente experto del departamento de aduanas de una empresa española (Wixia) especializado en documentación de tránsito comunitario (T1/T2/TIR).
                Tu misión es clasificar el documento recibido y extraer con precisión los campos relevantes para preparar una declaración de tránsito NCTS.
                Trabaja siempre en español. Devuelve valores tal como aparecen en el documento (no traduzcas nombres de empresas o direcciones).
                Si un campo no está presente, deja la cadena vacía o el array vacío — nunca inventes datos.
                SYS,
            ],
            [
                'role'    => 'user',
                'content' => $this->construirContenidoUsuario($documento, $extraido),
            ],
        ];

        $schema = $this->schemaDocumento();

        $resultado = $this->openai->json($mensajes, $schema);

        $documento->update([
            'tipo_detectado'   => $resultado['tipo'] ?? 'otro',
            'confianza'        => (float) ($resultado['confianza'] ?? 0),
            // Solo guardamos texto si de verdad lo extrajimos (fallback);
            // cuando enviamos el archivo directo al modelo, no hay texto local.
            'texto_extraido'   => $extraido['texto'] ?? null,
            'datos_extraidos'  => $resultado['datos'] ?? [],
            'nota_ia'          => $resultado['resumen'] ?? null,
            'estado'           => 'analizado',
        ]);
    }

    /**
     * Tamaño máximo del archivo (bytes) para inyectarlo directo al modelo.
     * 15 MB del PDF → ~20 MB en base64, dentro del límite de la API.
     */
    protected const MAX_ARCHIVO_DIRECTO = 15 * 1024 * 1024;

    /**
     * Devuelve el "content" listo para GPT: prioriza envío directo del
     * documento (imagen o PDF) para que el modelo lea tablas, casillas,
     * sellos y firmas. Solo cae a texto plano si el archivo es TXT o si
     * excede el límite y necesitamos extracción por fallback.
     *
     * @return array{modo: string, texto: ?string, archivo_base64: ?string, archivo_mime: ?string}
     */
    protected function extraerContenido(Documento $documento): array
    {
        $ruta = Storage::disk('public')->path($documento->ruta);
        $mime = strtolower((string) $documento->mime);
        $nombre = strtolower((string) $documento->nombre_original);
        $tamano = is_file($ruta) ? filesize($ruta) : 0;

        // Imágenes → base64 → visión
        if (str_starts_with($mime, 'image/')) {
            if ($tamano > 0 && $tamano <= self::MAX_ARCHIVO_DIRECTO) {
                return [
                    'modo'            => 'imagen',
                    'texto'           => null,
                    'archivo_base64'  => base64_encode((string) @file_get_contents($ruta)),
                    'archivo_mime'    => $mime,
                ];
            }
        }

        // PDF → base64 → adjunto directo al modelo (Chat Completions "file")
        if ($mime === 'application/pdf' || str_ends_with($nombre, '.pdf')) {
            if ($tamano > 0 && $tamano <= self::MAX_ARCHIVO_DIRECTO) {
                return [
                    'modo'            => 'pdf',
                    'texto'           => null,
                    'archivo_base64'  => base64_encode((string) @file_get_contents($ruta)),
                    'archivo_mime'    => 'application/pdf',
                ];
            }
            // Fallback: PDF demasiado grande → extraer texto con pdftotext
            return [
                'modo'            => 'texto',
                'texto'           => $this->pdfATexto($ruta),
                'archivo_base64'  => null,
                'archivo_mime'    => null,
            ];
        }

        // Texto plano (.txt) → contenido directo
        return [
            'modo'            => 'texto',
            'texto'           => (string) @file_get_contents($ruta),
            'archivo_base64'  => null,
            'archivo_mime'    => null,
        ];
    }

    protected function pdfATexto(string $ruta): string
    {
        $bin = trim((string) @shell_exec('command -v pdftotext'));
        if ($bin === '') {
            return '[PDF demasiado grande y sin extractor de texto en el servidor]';
        }
        $tmp = tempnam(sys_get_temp_dir(), 'wixia_pdf_').'.txt';
        @shell_exec(sprintf('%s -layout %s %s 2>/dev/null', escapeshellcmd($bin), escapeshellarg($ruta), escapeshellarg($tmp)));
        $texto = @file_get_contents($tmp) ?: '';
        @unlink($tmp);
        return mb_substr($texto, 0, 20000);
    }

    /**
     * @param  array{modo: string, texto: ?string, archivo_base64: ?string, archivo_mime: ?string}  $extraido
     * @return string|array<int, array<string, mixed>>
     */
    protected function construirContenidoUsuario(Documento $documento, array $extraido)
    {
        $encabezado = "Documento adjunto: {$documento->nombre_original}\n\n";
        $encabezado .= "Instrucciones:\n";
        $encabezado .= "1. Determina el TIPO del documento entre: factura_comercial, cmr, conocimiento_embarque, certificado_fitosanitario, certificado_conformidad, ics2, packing_list, otro. Una \"Declaración de tránsito emitida\" (T1/T2 con MRN) clasifícala como 'otro' con tipo real en observaciones.\n";
        $encabezado .= "2. Estima tu confianza (0-100). Fíjate también en sellos, firmas, casillas marcadas y anotaciones manuscritas.\n";
        $encabezado .= "3. Redacta un resumen breve (máx. 240 caracteres) en español.\n";
        $encabezado .= "4. Extrae los CAMPOS relevantes para una declaración de tránsito NCTS y devuélvelos en 'datos' con estas claves cuando existan: expedidor{nombre,direccion,eori,pais}, consignatario{nombre,direccion,eori,pais}, transportista{nombre,matricula,pais}, medio_transporte, referencia_documento, mrn, lrn, tipo_declaracion (T1/T2/T2F/TIR), titular_regimen{nombre,eori}, garantia_referencia, precintos, fecha_emision, aduana_partida, aduana_destino, aduana_paso, valor_total, moneda, incoterm, peso_bruto_kg, peso_neto_kg, bultos, mercancias[]{descripcion,codigo_hs,cantidad,unidad,valor,peso_kg,pais_origen}, observaciones.\n\n";
        $encabezado .= "REGLAS CRÍTICAS DE NÚMEROS:\n";
        $encabezado .= "· En documentos aduaneros europeos el separador de miles suele ser '.' y el decimal ','. Ejemplo: '22.153,00' = 22153.00 (veintidós mil ciento cincuenta y tres), NO 22,153.\n";
        $encabezado .= "· '1.234,56' → 1234.56 · '15.355' (sin coma) suele ser 15355 unidades enteras (kg, cajas) → devuelve 15355, no 15.355.\n";
        $encabezado .= "· Si un peso o cantidad parece anormalmente pequeño para la operación descrita, revisa si estás cayendo en la trampa del separador europeo.\n";
        $encabezado .= "· Códigos EORI conservan formato original (letras + cifras, ej. ESB72145238, GB123456789000).\n";

        // Imagen directa (JPG/PNG/WEBP)
        if ($extraido['modo'] === 'imagen' && $extraido['archivo_base64']) {
            return [
                ['type' => 'text', 'text' => $encabezado],
                ['type' => 'image_url', 'image_url' => [
                    'url' => 'data:'.$extraido['archivo_mime'].';base64,'.$extraido['archivo_base64'],
                ]],
            ];
        }

        // PDF directo (Chat Completions acepta type: file con file_data en base64)
        if ($extraido['modo'] === 'pdf' && $extraido['archivo_base64']) {
            return [
                ['type' => 'text', 'text' => $encabezado],
                ['type' => 'file', 'file' => [
                    'filename'  => $documento->nombre_original,
                    'file_data' => 'data:application/pdf;base64,'.$extraido['archivo_base64'],
                ]],
            ];
        }

        // Texto plano o fallback
        $texto = ($extraido['texto'] ?? '') !== '' ? $extraido['texto'] : '[Documento sin contenido extraíble]';
        return $encabezado."---\nCONTENIDO DEL DOCUMENTO:\n---\n".$texto;
    }

    protected function schemaDocumento(): array
    {
        $stringVacio = ['type' => ['string', 'null']];
        $numeroVacio = ['type' => ['number', 'null']];

        $parteEntidad = [
            'type' => 'object',
            'additionalProperties' => false,
            'properties' => [
                'nombre'    => $stringVacio,
                'direccion' => $stringVacio,
                'eori'      => $stringVacio,
                'pais'      => $stringVacio,
            ],
            'required' => ['nombre','direccion','eori','pais'],
        ];

        $mercancia = [
            'type' => 'object',
            'additionalProperties' => false,
            'properties' => [
                'descripcion' => $stringVacio,
                'codigo_hs'   => $stringVacio,
                'cantidad'    => $numeroVacio,
                'unidad'      => $stringVacio,
                'valor'       => $numeroVacio,
                'peso_kg'     => $numeroVacio,
                'pais_origen' => $stringVacio,
            ],
            'required' => ['descripcion','codigo_hs','cantidad','unidad','valor','peso_kg','pais_origen'],
        ];

        return [
            'type' => 'object',
            'additionalProperties' => false,
            'properties' => [
                'tipo'      => ['type' => 'string', 'enum' => array_keys(\App\Models\Documento::TIPOS)],
                'confianza' => ['type' => 'number', 'minimum' => 0, 'maximum' => 100],
                'resumen'   => ['type' => 'string'],
                'datos'     => [
                    'type' => 'object',
                    'additionalProperties' => false,
                    'properties' => [
                        'expedidor'           => $parteEntidad,
                        'consignatario'       => $parteEntidad,
                        'transportista'       => [
                            'type' => 'object',
                            'additionalProperties' => false,
                            'properties' => [
                                'nombre'    => $stringVacio,
                                'matricula' => $stringVacio,
                                'pais'      => $stringVacio,
                            ],
                            'required' => ['nombre','matricula','pais'],
                        ],
                        'medio_transporte'    => $stringVacio,
                        'referencia_documento'=> $stringVacio,
                        'mrn'                 => $stringVacio,
                        'lrn'                 => $stringVacio,
                        'tipo_declaracion'    => $stringVacio,
                        'titular_regimen'     => [
                            'type' => 'object',
                            'additionalProperties' => false,
                            'properties' => [
                                'nombre' => $stringVacio,
                                'eori'   => $stringVacio,
                            ],
                            'required' => ['nombre','eori'],
                        ],
                        'garantia_referencia' => $stringVacio,
                        'precintos'           => $stringVacio,
                        'fecha_emision'       => $stringVacio,
                        'aduana_partida'      => $stringVacio,
                        'aduana_destino'      => $stringVacio,
                        'aduana_paso'         => $stringVacio,
                        'valor_total'         => $numeroVacio,
                        'moneda'              => $stringVacio,
                        'incoterm'            => $stringVacio,
                        'peso_bruto_kg'       => $numeroVacio,
                        'peso_neto_kg'        => $numeroVacio,
                        'bultos'              => $numeroVacio,
                        'mercancias'          => ['type' => 'array', 'items' => $mercancia],
                        'observaciones'       => $stringVacio,
                    ],
                    'required' => [
                        'expedidor','consignatario','transportista','medio_transporte',
                        'referencia_documento','mrn','lrn','tipo_declaracion','titular_regimen',
                        'garantia_referencia','precintos','fecha_emision','aduana_partida',
                        'aduana_destino','aduana_paso','valor_total','moneda','incoterm',
                        'peso_bruto_kg','peso_neto_kg','bultos','mercancias','observaciones',
                    ],
                ],
            ],
            'required' => ['tipo','confianza','resumen','datos'],
        ];
    }
}
