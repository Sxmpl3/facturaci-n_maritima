<?php

namespace App\Http\Controllers;

use App\Models\Documento;
use App\Models\Expediente;
use App\Models\HistorialEvento;
use App\Services\DocumentoAnalyzer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Throwable;

class DocumentoController extends Controller
{
    public function store(Request $request, Expediente $expediente)
    {
        $request->validate([
            'archivos'   => 'required|array|min:1|max:15',
            'archivos.*' => 'file|max:20480|mimes:pdf,png,jpg,jpeg,txt,webp',
        ]);

        $creados = [];
        foreach ($request->file('archivos', []) as $archivo) {
            $ruta = $archivo->store("expedientes/{$expediente->id}", 'public');
            $doc = Documento::create([
                'expediente_id'   => $expediente->id,
                'nombre_original' => $archivo->getClientOriginalName(),
                'ruta'            => $ruta,
                'mime'            => $archivo->getMimeType(),
                'tamano'          => $archivo->getSize(),
                'estado'          => 'subido',
            ]);
            $creados[] = $doc->id;
        }

        HistorialEvento::create([
            'expediente_id' => $expediente->id,
            'user_id'       => $request->user()?->id,
            'accion'        => 'documentos.subidos',
            'detalle'       => count($creados).' documento(s) añadidos al expediente.',
            'meta'          => ['ids' => $creados],
        ]);

        return back();
    }

    public function analizar(Request $request, Expediente $expediente, DocumentoAnalyzer $analyzer, \App\Services\DeclaracionBuilder $builder)
    {
        // El análisis puede tardar 30-90s por llamadas al LLM
        @set_time_limit(300);
        @ini_set('max_execution_time', '300');

        $expediente->update(['estado' => 'analizando']);

        HistorialEvento::create([
            'expediente_id' => $expediente->id,
            'user_id'       => $request->user()?->id,
            'accion'        => 'analisis.iniciado',
            'detalle'       => 'Análisis IA iniciado sobre '.$expediente->documentos()->count().' documento(s).',
        ]);

        $errores = [];
        foreach ($expediente->documentos()->whereIn('estado', ['subido','error'])->get() as $doc) {
            try {
                $analyzer->analizar($doc);
            } catch (Throwable $e) {
                $doc->update(['estado' => 'error', 'nota_ia' => $e->getMessage()]);
                $errores[] = $doc->nombre_original.': '.$e->getMessage();
            }
        }

        // Consolidar en una declaración
        try {
            $builder->construir($expediente->fresh('documentos'));
            HistorialEvento::create([
                'expediente_id' => $expediente->id,
                'user_id'       => $request->user()?->id,
                'accion'        => 'declaracion.generada',
                'detalle'       => 'Declaración de tránsito generada automáticamente.',
            ]);
        } catch (Throwable $e) {
            HistorialEvento::create([
                'expediente_id' => $expediente->id,
                'user_id'       => $request->user()?->id,
                'accion'        => 'declaracion.error',
                'detalle'       => 'Fallo consolidando declaración: '.$e->getMessage(),
            ]);
            $errores[] = 'Consolidación: '.$e->getMessage();
        }

        if ($errores) {
            return back()->withErrors(['analisis' => $errores]);
        }

        return back();
    }

    public function destroy(Request $request, Expediente $expediente, Documento $documento)
    {
        abort_if($documento->expediente_id !== $expediente->id, 404);

        Storage::disk('public')->delete($documento->ruta);
        $documento->delete();

        HistorialEvento::create([
            'expediente_id' => $expediente->id,
            'user_id'       => $request->user()?->id,
            'accion'        => 'documento.eliminado',
            'detalle'       => 'Documento eliminado del expediente.',
        ]);

        return back();
    }
}
