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
            'texto_extraido'   => $extraido['texto'] ?? null,
            'datos_extraidos'  => $resultado['datos'] ?? [],
            'nota_ia'          => $resultado['resumen'] ?? null,
            'estado'           => 'analizado',
        ]);
    }

    /**
     * @return array{texto: string, imagen_base64: ?string, imagen_mime: ?string}
     */
    protected function extraerContenido(Documento $documento): array
    {
        $ruta = Storage::disk('public')->path($documento->ruta);
        $mime = strtolower((string) $documento->mime);

        // Imágenes → base64 para input multimodal
        if (str_starts_with($mime, 'image/')) {
            $bytes = @file_get_contents($ruta) ?: '';
            return [
                'texto'         => '',
                'imagen_base64' => base64_encode($bytes),
                'imagen_mime'   => $mime,
            ];
        }

        // PDF → extraer texto con pdftotext
        if ($mime === 'application/pdf' || str_ends_with(strtolower($documento->nombre_original), '.pdf')) {
            $texto = $this->pdfATexto($ruta);
            return ['texto' => $texto, 'imagen_base64' => null, 'imagen_mime' => null];
        }

        // Texto plano
        $texto = @file_get_contents($ruta) ?: '';
        return ['texto' => $texto, 'imagen_base64' => null, 'imagen_mime' => null];
    }

    protected function pdfATexto(string $ruta): string
    {
        $bin = trim((string) @shell_exec('command -v pdftotext'));
        if ($bin === '') {
            return '[PDF sin extractor disponible en el servidor]';
        }
        $tmp = tempnam(sys_get_temp_dir(), 'wixia_pdf_').'.txt';
        @shell_exec(sprintf('%s -layout %s %s 2>/dev/null', escapeshellcmd($bin), escapeshellarg($ruta), escapeshellarg($tmp)));
        $texto = @file_get_contents($tmp) ?: '';
        @unlink($tmp);
        // Cortar por si es muy largo
        return mb_substr($texto, 0, 20000);
    }

    /**
     * @param  array{texto: string, imagen_base64: ?string, imagen_mime: ?string}  $extraido
     * @return string|array<int, array<string, mixed>>
     */
    protected function construirContenidoUsuario(Documento $documento, array $extraido)
    {
        $encabezado = "Documento adjunto: {$documento->nombre_original}\n\n";
        $encabezado .= "Instrucciones:\n";
        $encabezado .= "1. Determina el TIPO del documento entre: factura_comercial, cmr, conocimiento_embarque, certificado_fitosanitario, certificado_conformidad, ics2, packing_list, otro.\n";
        $encabezado .= "2. Estima tu confianza (0-100).\n";
        $encabezado .= "3. Redacta un resumen breve (máx. 240 caracteres) en español.\n";
        $encabezado .= "4. Extrae los CAMPOS relevantes para una declaración de tránsito NCTS y devuélvelos en 'datos' con estas claves cuando existan: expedidor{nombre,direccion,eori,pais}, consignatario{nombre,direccion,eori,pais}, transportista{nombre,matricula,pais}, medio_transporte, referencia_documento, mrn, fecha_emision, aduana_partida, aduana_destino, valor_total, moneda, incoterm, peso_bruto_kg, peso_neto_kg, bultos, mercancias[]{descripcion,codigo_hs,cantidad,unidad,valor,peso_kg,pais_origen}, observaciones.\n\n";

        if ($extraido['imagen_base64']) {
            return [
                ['type' => 'text', 'text' => $encabezado],
                ['type' => 'image_url', 'image_url' => [
                    'url' => 'data:'.$extraido['imagen_mime'].';base64,'.$extraido['imagen_base64'],
                ]],
            ];
        }

        $texto = $extraido['texto'] !== '' ? $extraido['texto'] : '[Documento sin texto extraíble]';
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
                        'fecha_emision'       => $stringVacio,
                        'aduana_partida'      => $stringVacio,
                        'aduana_destino'      => $stringVacio,
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
                        'referencia_documento','mrn','fecha_emision','aduana_partida','aduana_destino',
                        'valor_total','moneda','incoterm','peso_bruto_kg','peso_neto_kg','bultos',
                        'mercancias','observaciones',
                    ],
                ],
            ],
            'required' => ['tipo','confianza','resumen','datos'],
        ];
    }
}
