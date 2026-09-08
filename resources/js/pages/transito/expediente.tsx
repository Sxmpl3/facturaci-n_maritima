import { Head, Link, router, useForm } from '@inertiajs/react';
import TransitoShell from '@/layouts/transito/shell';
import { FormEvent, useMemo, useRef, useState } from 'react';

type EstadoExp = 'borrador' | 'analizando' | 'revision' | 'validado';

interface Expediente {
    id: number;
    referencia: string;
    estado: EstadoExp;
    cliente: string | null;
    mrn: string | null;
    aduana_partida: string | null;
    aduana_destino: string | null;
    validado_en: string | null;
    creado: string | null;
}

interface Documento {
    id: number;
    nombre_original: string;
    url: string | null;
    mime: string | null;
    tamano: number;
    tipo_detectado: string | null;
    tipo_label: string;
    confianza: number | null;
    estado: string;
    nota_ia: string | null;
    datos_extraidos: Record<string, unknown> | null;
}

interface Declaracion {
    id: number;
    estado: string;
    datos: Record<string, any>;
    advertencias: string[];
    confianza_global: number | null;
    generado_en: string | null;
}

interface Historial {
    id: number; accion: string; detalle: string | null; usuario: string; cuando: string | null;
}

interface Props {
    expediente: Expediente;
    documentos: Documento[];
    declaracion: Declaracion | null;
    historial: Historial[];
}

const estadoLabel: Record<EstadoExp, string> = {
    borrador: 'Borrador', analizando: 'Analizando IA',
    revision: 'En revisión', validado: 'Validado',
};
const estadoTone: Record<EstadoExp, string> = {
    borrador: 'muted', analizando: 'warn', revision: 'signal', validado: 'ok',
};

export default function ExpedienteView({ expediente, documentos, declaracion, historial }: Props) {
    const [tab, setTab] = useState<'declaracion' | 'documentos' | 'historial'>(
        declaracion ? 'declaracion' : 'documentos'
    );
    const [analizando, setAnalizando] = useState(false);
    const [preview, setPreview] = useState<Documento | null>(null);

    const puedeAnalizar = documentos.length > 0 && expediente.estado !== 'validado';

    const lanzarAnalisis = () => {
        setAnalizando(true);
        router.post(`/transito/${expediente.id}/analizar`, {}, {
            preserveScroll: true,
            onFinish: () => setAnalizando(false),
        });
    };

    return (
        <TransitoShell
            section="transito"
            breadcrumb={expediente.referencia}
            actions={
                <div className="flex items-center gap-2">
                    <Link href="/transito" className="wx-btn wx-btn-ghost">Volver</Link>
                    {puedeAnalizar && (
                        <button onClick={lanzarAnalisis} disabled={analizando} className="wx-btn wx-btn">
                            {analizando ? 'Analizando…' : (declaracion ? 'Reanalizar' : 'Analizar con IA')}
                        </button>
                    )}
                </div>
            }
        >
            <Head title={`${expediente.referencia} · Wixia`} />

            {/* Header del expediente */}
            <section className="mb-8">
                <div className="flex flex-wrap items-start justify-between gap-6">
                    <div>
                        <div className="wx-eyebrow mb-2">Expediente de tránsito</div>
                        <h1 className="font-display font-bold text-[46px] leading-none tabular-nums">{expediente.referencia}</h1>
                        <div className="mt-3 flex items-center gap-3 flex-wrap">
                            <span className="wx-chip" data-tone={estadoTone[expediente.estado]}>
                                <span className="dot" />{estadoLabel[expediente.estado]}
                            </span>
                            {declaracion?.confianza_global != null && (
                                <span className="wx-chip" data-tone={
                                    declaracion.confianza_global >= 85 ? 'ok' :
                                    declaracion.confianza_global >= 60 ? 'warn' : 'error'
                                }>
                                    <span className="dot" />IA · {Math.round(declaracion.confianza_global)}% confianza
                                </span>
                            )}
                            {expediente.mrn && <span className="wx-chip"><span className="dot" />MRN {expediente.mrn}</span>}
                        </div>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-[12px] min-w-[260px]">
                        <dt className="text-[color:var(--color-wx-muted)]">Cliente</dt>
                        <dd>{expediente.cliente ?? '—'}</dd>
                        <dt className="text-[color:var(--color-wx-muted)]">Partida</dt>
                        <dd className="tabular-nums">{expediente.aduana_partida ?? '—'}</dd>
                        <dt className="text-[color:var(--color-wx-muted)]">Destino</dt>
                        <dd className="tabular-nums">{expediente.aduana_destino ?? '—'}</dd>
                        <dt className="text-[color:var(--color-wx-muted)]">Creado</dt>
                        <dd>{expediente.creado}</dd>
                        {expediente.validado_en && <>
                            <dt className="text-[color:var(--color-wx-muted)]">Validado</dt>
                            <dd className="text-[color:var(--color-wx-ok)]">{expediente.validado_en}</dd>
                        </>}
                    </dl>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 lg:gap-8">
                {/* Panel izquierdo: documentos */}
                <section>
                    <DocumentosPanel
                        expedienteId={expediente.id}
                        documentos={documentos}
                        onPreview={setPreview}
                        bloqueado={expediente.estado === 'validado'}
                    />
                </section>

                {/* Panel derecho: tabs */}
                <section>
                    <nav className="flex items-center gap-6 border-b border-[color:var(--color-wx-inkline)] mb-6">
                        {[
                            { k: 'declaracion', l: 'Declaración', disabled: !declaracion },
                            { k: 'documentos',  l: 'Detalle documentos' },
                            { k: 'historial',   l: 'Historial' },
                        ].map(t => (
                            <button
                                key={t.k}
                                disabled={!!t.disabled}
                                onClick={() => setTab(t.k as any)}
                                className={[
                                    'py-3 text-[13px] border-b-2 -mb-px transition-colors',
                                    tab === t.k
                                        ? 'border-[color:var(--color-wx-ink)] text-[color:var(--color-wx-ink)]'
                                        : 'border-transparent text-[color:var(--color-wx-muted)] hover:text-[color:var(--color-wx-ink)]',
                                    t.disabled ? 'opacity-40 cursor-not-allowed' : '',
                                ].join(' ')}
                            >
                                {t.l}
                            </button>
                        ))}
                    </nav>

                    {tab === 'declaracion' && declaracion && (
                        <DeclaracionEditor
                            expedienteId={expediente.id}
                            declaracion={declaracion}
                            estadoExpediente={expediente.estado}
                        />
                    )}
                    {tab === 'declaracion' && !declaracion && (
                        <div className="wx-card p-8 text-center">
                            <div className="font-display font-bold text-[26px] mb-2">Sin declaración aún.</div>
                            <p className="text-[13px] text-[color:var(--color-wx-ink-2)] max-w-[46ch] mx-auto">
                                Sube al menos un documento y lanza el análisis con IA para que Wixia
                                proponga la declaración de tránsito.
                            </p>
                        </div>
                    )}
                    {tab === 'documentos' && (
                        <DocumentosDetalle documentos={documentos} onPreview={setPreview} />
                    )}
                    {tab === 'historial' && (
                        <HistorialLista historial={historial} />
                    )}
                </section>
            </div>

            {preview && <VisorDocumento documento={preview} onClose={() => setPreview(null)} />}
        </TransitoShell>
    );
}

/* -------------------------------------------------------------------- */
/* Panel izquierdo: documentos + dropzone                                */
/* -------------------------------------------------------------------- */

function DocumentosPanel({
    expedienteId, documentos, onPreview, bloqueado,
}: {
    expedienteId: number;
    documentos: Documento[];
    onPreview: (d: Documento) => void;
    bloqueado: boolean;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [drag, setDrag] = useState(false);
    const [subiendo, setSubiendo] = useState(false);

    const enviar = (files: FileList | File[]) => {
        if (!files || (files as FileList).length === 0) return;
        const fd = new FormData();
        Array.from(files).forEach(f => fd.append('archivos[]', f));
        setSubiendo(true);
        router.post(`/transito/${expedienteId}/documentos`, fd, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => setSubiendo(false),
        });
    };

    return (
        <div className="wx-card">
            <div className="p-5 border-b border-[color:var(--color-wx-inkline)]">
                <div className="wx-eyebrow mb-1">Documentación del expediente</div>
                <div className="text-[13px] text-[color:var(--color-wx-ink-2)]">
                    Factura, CMR, B/L, certificados, ICS2… todo lo que llegue.
                </div>
            </div>

            {/* Dropzone */}
            {!bloqueado && (
                <div className="p-4">
                    <label
                        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                        onDragLeave={() => setDrag(false)}
                        onDrop={(e) => {
                            e.preventDefault(); setDrag(false);
                            enviar(e.dataTransfer.files);
                        }}
                        className={[
                            'block border border-dashed p-6 text-center cursor-pointer transition-colors',
                            drag
                                ? 'border-[color:var(--color-wx-signal)] bg-[color:var(--color-wx-signal)]/5'
                                : 'border-[color:var(--color-wx-rule)] hover:border-[color:var(--color-wx-ink-2)]',
                        ].join(' ')}
                    >
                        <input
                            ref={inputRef}
                            type="file"
                            multiple
                            accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
                            className="sr-only"
                            onChange={(e) => e.target.files && enviar(e.target.files)}
                        />
                        <div className="font-display font-bold text-[20px] leading-tight mb-1">
                            {subiendo ? 'Subiendo…' : 'Arrastra documentos aquí'}
                        </div>
                        <div className="text-[12px] text-[color:var(--color-wx-muted)]">
                            o haz clic — PDF, imagen o texto · máx 20 MB
                        </div>
                    </label>
                </div>
            )}

            {/* Lista */}
            <ul className="divide-y divide-[color:var(--color-wx-inkline)]">
                {documentos.length === 0 && (
                    <li className="p-6 text-center text-[13px] text-[color:var(--color-wx-muted)]">
                        Aún no hay documentos adjuntos.
                    </li>
                )}
                {documentos.map((d) => (
                    <li key={d.id} className="p-4 flex items-start gap-3">
                        <div className="w-8 h-10 border border-[color:var(--color-wx-inkline)] bg-[color:var(--color-wx-paper)] flex items-center justify-center text-[9px] tracking-widest text-[color:var(--color-wx-muted)]">
                            {formatoAbreviado(d.mime, d.nombre_original)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <button
                                onClick={() => onPreview(d)}
                                className="text-[13px] text-left leading-tight hover:text-[color:var(--color-wx-signal)] truncate block w-full"
                            >
                                {d.nombre_original}
                            </button>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                {d.tipo_detectado ? (
                                    <span className="wx-chip"><span className="dot" />{d.tipo_label}</span>
                                ) : (
                                    <span className="wx-chip" data-tone="muted"><span className="dot" />sin analizar</span>
                                )}
                                {d.confianza != null && (
                                    <span className="text-[11px] tabular-nums text-[color:var(--color-wx-muted)]">{Math.round(d.confianza)}%</span>
                                )}
                                <span className="text-[11px] text-[color:var(--color-wx-muted)] tabular-nums">{formatoBytes(d.tamano)}</span>
                            </div>
                            {d.nota_ia && <p className="mt-2 text-[11px] text-[color:var(--color-wx-ink-2)] leading-snug">{d.nota_ia}</p>}
                        </div>
                        {!bloqueado && (
                            <button
                                onClick={() => {
                                    if (confirm('¿Eliminar este documento?')) {
                                        router.delete(`/transito/${expedienteId}/documentos/${d.id}`, { preserveScroll: true });
                                    }
                                }}
                                className="text-[11px] text-[color:var(--color-wx-muted)] hover:text-[color:var(--color-wx-error)] mt-0.5"
                                title="Eliminar"
                            >
                                ✕
                            </button>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

/* -------------------------------------------------------------------- */
/* Editor de declaración                                                 */
/* -------------------------------------------------------------------- */

function DeclaracionEditor({
    expedienteId, declaracion, estadoExpediente,
}: {
    expedienteId: number;
    declaracion: Declaracion;
    estadoExpediente: EstadoExp;
}) {
    const [datos, setDatos] = useState<Record<string, any>>(declaracion.datos ?? {});
    const [guardando, setGuardando] = useState(false);
    const [validando, setValidando] = useState(false);

    const validado = estadoExpediente === 'validado';

    const set = (path: string, valor: any) => {
        setDatos((prev) => {
            const copia = structuredClone(prev);
            const keys = path.split('.');
            let cursor: any = copia;
            for (let i = 0; i < keys.length - 1; i++) {
                cursor[keys[i]] = cursor[keys[i]] ?? {};
                cursor = cursor[keys[i]];
            }
            cursor[keys[keys.length - 1]] = valor;
            return copia;
        });
    };

    const guardar = (e?: FormEvent) => {
        e?.preventDefault();
        setGuardando(true);
        router.patch(`/transito/${expedienteId}/declaracion`, { datos }, {
            preserveScroll: true,
            onFinish: () => setGuardando(false),
        });
    };

    const validar = () => {
        if (!confirm('¿Confirmas la validación definitiva? Se marcará como listo para S-4.')) return;
        setValidando(true);
        router.post(`/transito/${expedienteId}/validar`, {}, {
            preserveScroll: true,
            onFinish: () => setValidando(false),
        });
    };

    return (
        <form onSubmit={guardar} className="space-y-6">
            {/* Advertencias IA */}
            {declaracion.advertencias.length > 0 && (
                <div className="border-l-2 border-[color:var(--color-wx-warn)] pl-4 py-2 bg-[color:var(--color-wx-warn)]/8">
                    <div className="text-[11px] text-[color:var(--color-wx-warn)] uppercase tracking-wider mb-1">
                        {declaracion.advertencias.length} advertencia{declaracion.advertencias.length > 1 ? 's' : ''} de la IA
                    </div>
                    <ul className="text-[12px] text-[color:var(--color-wx-ink)] space-y-0.5">
                        {declaracion.advertencias.map((a, i) => <li key={i}>· {a}</li>)}
                    </ul>
                </div>
            )}

            <Bloque titulo="Datos generales">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Field label="Tipo" value={datos?.tipo_declaracion} onChange={v => set('tipo_declaracion', v)} disabled={validado} />
                    <Field label="MRN"  value={datos?.mrn}              onChange={v => set('mrn', v)} disabled={validado} />
                    <Field label="LRN"  value={datos?.lrn}              onChange={v => set('lrn', v)} disabled={validado} />
                    <Field label="Aduana partida" value={datos?.aduana_partida} onChange={v => set('aduana_partida', v)} disabled={validado} />
                    <Field label="Aduana destino" value={datos?.aduana_destino} onChange={v => set('aduana_destino', v)} disabled={validado} />
                    <Field label="Aduana de paso" value={datos?.aduana_paso}    onChange={v => set('aduana_paso', v)} disabled={validado} />
                    <Field label="Incoterm"       value={datos?.incoterm}       onChange={v => set('incoterm', v)} disabled={validado} />
                    <Field label="Moneda"         value={datos?.moneda}         onChange={v => set('moneda', v)} disabled={validado} />
                    <Field label="Valor total"    value={datos?.valor_total}    onChange={v => set('valor_total', v)} disabled={validado} />
                </div>
            </Bloque>

            <Bloque titulo="Expedidor">
                <Entidad prefix="expedidor" datos={datos} set={set} disabled={validado} />
            </Bloque>

            <Bloque titulo="Consignatario">
                <Entidad prefix="consignatario" datos={datos} set={set} disabled={validado} />
            </Bloque>

            <Bloque titulo="Declarante">
                <Entidad prefix="declarante" datos={datos} set={set} disabled={validado} />
            </Bloque>

            <Bloque titulo="Transporte">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Field label="Modo"           value={datos?.transporte?.modo}           onChange={v => set('transporte.modo', v)} disabled={validado} />
                    <Field label="Identificación" value={datos?.transporte?.identificacion} onChange={v => set('transporte.identificacion', v)} disabled={validado} />
                    <Field label="Nacionalidad"   value={datos?.transporte?.nacionalidad}   onChange={v => set('transporte.nacionalidad', v)} disabled={validado} />
                </div>
            </Bloque>

            <Bloque titulo="Garantía">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Field label="Tipo"       value={datos?.garantia?.tipo}      onChange={v => set('garantia.tipo', v)} disabled={validado} />
                    <Field label="Referencia" value={datos?.garantia?.referencia} onChange={v => set('garantia.referencia', v)} disabled={validado} />
                    <Field label="Importe"    value={datos?.garantia?.importe}   onChange={v => set('garantia.importe', v)} disabled={validado} />
                </div>
            </Bloque>

            <Bloque titulo={`Mercancías · ${Array.isArray(datos?.mercancias) ? datos.mercancias.length : 0} partida(s)`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-[12px]">
                        <thead>
                            <tr className="text-left text-[11px] text-[color:var(--color-wx-muted)] border-b border-[color:var(--color-wx-inkline)]">
                                <th className="py-2 pr-3 font-normal">Nº</th>
                                <th className="py-2 pr-3 font-normal">Descripción</th>
                                <th className="py-2 pr-3 font-normal">HS</th>
                                <th className="py-2 pr-3 font-normal">Cant.</th>
                                <th className="py-2 pr-3 font-normal">Peso bruto</th>
                                <th className="py-2 pr-3 font-normal">Valor</th>
                                <th className="py-2 pr-3 font-normal">Origen</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(datos?.mercancias ?? []).map((m: any, i: number) => (
                                <tr key={i} className="border-b border-[color:var(--color-wx-inkline)]/60">
                                    <td className="py-2 pr-3 tabular-nums text-[color:var(--color-wx-muted)]">{m.partida ?? i+1}</td>
                                    <td className="py-2 pr-3">
                                        <input className="wx-input py-1.5" value={m.descripcion ?? ''} disabled={validado}
                                               onChange={(e) => set(`mercancias.${i}.descripcion`, e.target.value)} />
                                    </td>
                                    <td className="py-2 pr-3">
                                        <input className="wx-input py-1.5 tabular-nums" value={m.codigo_hs ?? ''} disabled={validado}
                                               onChange={(e) => set(`mercancias.${i}.codigo_hs`, e.target.value)} />
                                    </td>
                                    <td className="py-2 pr-3 tabular-nums">{m.cantidad ?? '—'} {m.unidad ?? ''}</td>
                                    <td className="py-2 pr-3 tabular-nums">{m.peso_bruto_kg ?? '—'} kg</td>
                                    <td className="py-2 pr-3 tabular-nums">{m.valor ?? '—'} {m.moneda ?? ''}</td>
                                    <td className="py-2 pr-3">{m.pais_origen ?? '—'}</td>
                                </tr>
                            ))}
                            {(!datos?.mercancias || datos.mercancias.length === 0) && (
                                <tr><td colSpan={7} className="py-4 text-center text-[color:var(--color-wx-muted)]">Sin mercancías detectadas.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Bloque>

            <Bloque titulo="Documentación asociada">
                <ul className="text-[12px] space-y-1">
                    {(datos?.documentos ?? []).map((d: any, i: number) => (
                        <li key={i} className="flex items-center gap-3">
                            <span className="wx-chip"><span className="dot" />{d.tipo}</span>
                            <span className="tabular-nums">{d.referencia}</span>
                            {d.fecha && <span className="text-[color:var(--color-wx-muted)]">· {d.fecha}</span>}
                        </li>
                    ))}
                    {(!datos?.documentos || datos.documentos.length === 0) && (
                        <li className="text-[color:var(--color-wx-muted)]">Sin documentación asociada.</li>
                    )}
                </ul>
            </Bloque>

            <div className="flex items-center gap-3 pt-4 border-t border-[color:var(--color-wx-inkline)]">
                {!validado && (
                    <>
                        <button type="submit" disabled={guardando} className="wx-btn">
                            {guardando ? 'Guardando…' : 'Guardar cambios'}
                        </button>
                        <button type="button" onClick={validar} disabled={validando} className="wx-btn wx-btn">
                            {validando ? 'Validando…' : 'Validar declaración'}
                        </button>
                    </>
                )}
                {validado && (
                    <div className="wx-chip" data-tone="ok"><span className="dot" />Declaración validada y bloqueada</div>
                )}
                <p className="text-[11px] text-[color:var(--color-wx-muted)] ml-auto">
                    Generado {declaracion.generado_en} · confianza global {declaracion.confianza_global != null ? Math.round(declaracion.confianza_global) : '—'}%
                </p>
            </div>
        </form>
    );
}

function Entidad({ prefix, datos, set, disabled }: { prefix: string; datos: any; set: (p: string, v: any) => void; disabled: boolean; }) {
    const d = datos?.[prefix] ?? {};
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Nombre"    value={d.nombre}    onChange={v => set(`${prefix}.nombre`, v)}    disabled={disabled} />
            <Field label="EORI"      value={d.eori}      onChange={v => set(`${prefix}.eori`, v)}      disabled={disabled} />
            <Field label="País"      value={d.pais}      onChange={v => set(`${prefix}.pais`, v)}      disabled={disabled} />
            <Field label="Dirección" value={d.direccion} onChange={v => set(`${prefix}.direccion`, v)} disabled={disabled} full />
            <Field label="Ciudad"    value={d.ciudad}    onChange={v => set(`${prefix}.ciudad`, v)}    disabled={disabled} />
            <Field label="Código postal" value={d.cp}    onChange={v => set(`${prefix}.cp`, v)}        disabled={disabled} />
        </div>
    );
}

function Field({ label, value, onChange, disabled, full }: {
    label: string; value: any; onChange: (v: string) => void; disabled?: boolean; full?: boolean;
}) {
    return (
        <div className={full ? 'md:col-span-3' : ''}>
            <label className="wx-label">{label}</label>
            <input
                className="wx-input"
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
            />
        </div>
    );
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
    return (
        <section className="wx-card p-5 lg:p-6">
            <div className="wx-eyebrow mb-4">{titulo}</div>
            {children}
        </section>
    );
}

/* -------------------------------------------------------------------- */
/* Detalle documentos                                                    */
/* -------------------------------------------------------------------- */

function DocumentosDetalle({ documentos, onPreview }: { documentos: Documento[]; onPreview: (d: Documento) => void; }) {
    if (documentos.length === 0) {
        return (
            <div className="wx-card p-8 text-center">
                <div className="font-display font-bold text-[24px] mb-2">No hay documentos.</div>
                <p className="text-[13px] text-[color:var(--color-wx-ink-2)]">Sube documentos en el panel izquierdo.</p>
            </div>
        );
    }
    return (
        <div className="space-y-4">
            {documentos.map((d) => (
                <article key={d.id} className="wx-card p-5">
                    <header className="flex items-center justify-between gap-4 mb-3">
                        <div>
                            <div className="text-[13px] font-medium">{d.nombre_original}</div>
                            <div className="text-[11px] text-[color:var(--color-wx-muted)] mt-1">
                                {d.tipo_label} · confianza {d.confianza != null ? Math.round(d.confianza) + '%' : '—'} · {formatoBytes(d.tamano)}
                            </div>
                        </div>
                        <button onClick={() => onPreview(d)} className="wx-btn wx-btn-ghost text-[12px]">Ver documento</button>
                    </header>
                    {d.nota_ia && (
                        <p className="text-[12px] text-[color:var(--color-wx-ink-2)] mb-3 border-l-2 border-[color:var(--color-wx-signal)] pl-3">
                            {d.nota_ia}
                        </p>
                    )}
                    {d.datos_extraidos && (
                        <DatosGrid datos={d.datos_extraidos} />
                    )}
                </article>
            ))}
        </div>
    );
}

function DatosGrid({ datos }: { datos: Record<string, any> }) {
    const pares: [string, string][] = useMemo(() => aplanar(datos), [datos]);
    if (pares.length === 0) return null;
    return (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[12px]">
            {pares.map(([k, v]) => (
                <div key={k}>
                    <dt className="text-[11px] text-[color:var(--color-wx-muted)]">{k}</dt>
                    <dd className="tabular-nums">{v}</dd>
                </div>
            ))}
        </dl>
    );
}

function aplanar(obj: any, prefix = ''): [string, string][] {
    const out: [string, string][] = [];
    if (obj === null || obj === undefined) return out;
    if (Array.isArray(obj)) {
        if (obj.length === 0) return out;
        out.push([prefix || 'items', `${obj.length} elemento(s)`]);
        return out;
    }
    if (typeof obj !== 'object') {
        return [[prefix, String(obj)]];
    }
    for (const [k, v] of Object.entries(obj)) {
        if (v === null || v === undefined || v === '' ||
            (Array.isArray(v) && v.length === 0)) continue;
        const nombre = prefix ? `${prefix} · ${k}` : k;
        if (typeof v === 'object' && !Array.isArray(v)) {
            out.push(...aplanar(v, nombre));
        } else if (Array.isArray(v)) {
            out.push([nombre, `${v.length} elemento(s)`]);
        } else {
            out.push([nombre, String(v)]);
        }
    }
    return out;
}

/* -------------------------------------------------------------------- */
/* Historial                                                             */
/* -------------------------------------------------------------------- */

function HistorialLista({ historial }: { historial: Historial[] }) {
    if (historial.length === 0) return (
        <div className="wx-card p-8 text-center text-[13px] text-[color:var(--color-wx-muted)]">
            Aún no hay actividad registrada.
        </div>
    );
    return (
        <ol className="relative pl-6 border-l border-[color:var(--color-wx-rule)] space-y-5">
            {historial.map((h) => (
                <li key={h.id} className="relative">
                    <span className="absolute -left-[27px] top-1.5 w-2 h-2 rounded-full bg-[color:var(--color-wx-signal)]" />
                    <div className="text-[12px] text-[color:var(--color-wx-muted)] tabular-nums">{h.cuando}</div>
                    <div className="text-[13px] leading-snug">{h.detalle}</div>
                    <div className="text-[11px] text-[color:var(--color-wx-muted)] mt-0.5">
                        <span className="uppercase tracking-wider">{h.accion}</span> · {h.usuario}
                    </div>
                </li>
            ))}
        </ol>
    );
}

/* -------------------------------------------------------------------- */
/* Visor modal                                                           */
/* -------------------------------------------------------------------- */

function VisorDocumento({ documento, onClose }: { documento: Documento; onClose: () => void; }) {
    const esImagen = documento.mime?.startsWith('image/');
    const esPdf = documento.mime === 'application/pdf' || documento.nombre_original.toLowerCase().endsWith('.pdf');
    return (
        <div className="fixed inset-0 z-50 bg-[color:var(--color-wx-ink)]/80 flex items-stretch justify-center p-6 overflow-auto">
            <div className="bg-[color:var(--color-wx-paper)] w-full max-w-5xl flex flex-col shadow-xl">
                <header className="flex items-center justify-between px-5 py-3 border-b border-[color:var(--color-wx-inkline)]">
                    <div>
                        <div className="text-[13px] font-medium">{documento.nombre_original}</div>
                        <div className="text-[11px] text-[color:var(--color-wx-muted)]">{documento.tipo_label}</div>
                    </div>
                    <button onClick={onClose} className="wx-btn wx-btn-ghost">Cerrar</button>
                </header>
                <div className="flex-1 min-h-[60vh] bg-[color:var(--color-wx-paper-2)] flex items-center justify-center">
                    {esImagen && documento.url && <img src={documento.url} alt="" className="max-h-[80vh] max-w-full" />}
                    {esPdf && documento.url && (
                        <object data={documento.url} type="application/pdf" className="w-full h-[80vh]">
                            <a href={documento.url} target="_blank" rel="noreferrer" className="wx-btn wx-btn">Abrir PDF</a>
                        </object>
                    )}
                    {!esImagen && !esPdf && documento.url && (
                        <a href={documento.url} target="_blank" rel="noreferrer" className="wx-btn wx-btn">Descargar</a>
                    )}
                </div>
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------- */

function formatoBytes(b: number) {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function formatoAbreviado(mime: string | null, nombre: string) {
    const ext = nombre.split('.').pop()?.toUpperCase();
    if (mime?.includes('pdf') || ext === 'PDF') return 'PDF';
    if (mime?.startsWith('image/')) return 'IMG';
    return ext ?? 'DOC';
}
