import { Head, Link } from '@inertiajs/react';
import TransitoShell from '@/layouts/transito/shell';

interface Expediente {
    id: number;
    referencia: string;
    estado: 'borrador'|'analizando'|'revision'|'validado';
    cliente: string | null;
    mrn: string | null;
    aduana_partida: string | null;
    aduana_destino: string | null;
    documentos_count: number;
    confianza: number | null;
    advertencias: number;
    creado: string | null;
}
interface Props {
    expedientes: Expediente[];
    resumen: { total: number; borrador: number; analizando: number; revision: number; validado: number; };
}

const estadoLabel: Record<Expediente['estado'], string> = {
    borrador: 'Borrador', analizando: 'Analizando', revision: 'En revisión', validado: 'Validado',
};
const estadoTone: Record<Expediente['estado'], string> = {
    borrador: 'muted', analizando: 'warn', revision: 'signal', validado: 'ok',
};

export default function TransitoIndex({ expedientes, resumen }: Props) {
    return (
        <TransitoShell
            section="transito"
            actions={
                <Link href="/transito/nuevo" className="wx-btn !px-3 sm:!px-4">
                    <PlusIcon />
                    <span className="hidden sm:inline">Nuevo expediente</span>
                    <span className="sm:hidden">Nuevo</span>
                </Link>
            }
        >
            <Head title="Expedientes de tránsito · Wixia" />

            {/* Título con marca decorativa 2×2 */}
            <div className="flex items-start gap-3 sm:gap-4 mb-6 sm:mb-8">
                <div className="grid grid-cols-2 gap-0.5 mt-1 sm:mt-1.5 shrink-0">
                    <span className="block w-3 h-3 sm:w-4 sm:h-4 bg-[color:var(--color-wx-block-gray)]" />
                    <span className="block w-3 h-3 sm:w-4 sm:h-4 bg-[color:var(--color-wx-blue)]" />
                    <span className="block w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="block w-3 h-3 sm:w-4 sm:h-4 bg-[color:var(--color-wx-block-dark)]" />
                </div>
                <div className="min-w-0">
                    <div className="wx-eyebrow mb-1">Módulo 01 · Tránsito</div>
                    <h1 className="font-display text-[24px] sm:text-[32px] lg:text-[38px] font-bold leading-[1.15]">
                        Bienvenida al Sistema Inteligente{' '}
                        <span className="text-[color:var(--color-wx-blue)]">de Gestión de Declaraciones Aduaneras</span>
                    </h1>
                    <p className="mt-2 text-[13px] sm:text-[14px] text-[color:var(--color-wx-ink-2)]">
                        Todos los expedientes de tránsito, con su estado en el ciclo IA-operador. La validación siempre es humana.
                    </p>
                </div>
            </div>

            {/* Métricas superiores — cards blancas con acento circular como el mockup del PDF */}
            <section className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                {[
                    { k: 'Total',      v: resumen.total,      hue: '#1E4FE0' },
                    { k: 'Borrador',   v: resumen.borrador,   hue: '#6B7280' },
                    { k: 'Analizando', v: resumen.analizando, hue: '#C97D2F' },
                    { k: 'Revisión',   v: resumen.revision,   hue: '#7C3AED' },
                    { k: 'Validados',  v: resumen.validado,   hue: '#2E7D57' },
                ].map(m => (
                    <div key={m.k} className="wx-card p-5 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: `${m.hue}15`, color: m.hue }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/></svg>
                        </div>
                        <div>
                            <div className="text-[26px] font-bold leading-none tabular-nums" style={{ color: m.hue }}>{m.v}</div>
                            <div className="text-[11px] text-[color:var(--color-wx-muted)] mt-1 uppercase tracking-wider">{m.k}</div>
                        </div>
                    </div>
                ))}
            </section>

            {/* Tabla de expedientes */}
            <section className="wx-card overflow-hidden">
                <header className="flex items-center justify-between px-6 py-4 border-b border-[color:var(--color-wx-rule)]">
                    <div>
                        <div className="text-[15px] font-bold">Expedientes recientes</div>
                        <div className="text-[12px] text-[color:var(--color-wx-muted)]">Últimos 50 · orden por fecha</div>
                    </div>
                    <Link href="/transito/nuevo" className="wx-btn wx-btn-outline text-[12.5px] py-2 px-3.5">Nuevo</Link>
                </header>

                {expedientes.length === 0 ? (
                    <EmptyState />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-[13.5px]">
                            <thead>
                                <tr className="text-left text-[11px] text-[color:var(--color-wx-muted)] uppercase tracking-wider bg-[color:var(--color-wx-paper-2)]/60">
                                    <th className="px-5 py-3 font-medium">Referencia</th>
                                    <th className="px-5 py-3 font-medium">Cliente / expedidor</th>
                                    <th className="px-5 py-3 font-medium">Ruta aduanera</th>
                                    <th className="px-5 py-3 font-medium">MRN</th>
                                    <th className="px-5 py-3 font-medium">Docs</th>
                                    <th className="px-5 py-3 font-medium" title="Confianza de la declaración consolidada (cobertura y coherencia entre documentos)">Confianza decl.</th>
                                    <th className="px-5 py-3 font-medium">Estado</th>
                                    <th className="px-5 py-3 font-medium">Creado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expedientes.map(e => (
                                    <tr key={e.id} className="border-t border-[color:var(--color-wx-rule)] hover:bg-[color:var(--color-wx-paper-2)]/40 transition-colors">
                                        <td className="px-5 py-3">
                                            <Link href={`/transito/${e.id}`} className="font-medium text-[color:var(--color-wx-blue)] hover:underline tabular-nums">
                                                {e.referencia}
                                            </Link>
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="max-w-[24ch] truncate">{e.cliente ?? <em className="text-[color:var(--color-wx-muted)]">sin cliente</em>}</div>
                                        </td>
                                        <td className="px-5 py-3 text-[color:var(--color-wx-ink-2)]">
                                            {e.aduana_partida && e.aduana_destino ? (
                                                <span className="text-[12.5px] tabular-nums">{e.aduana_partida} → {e.aduana_destino}</span>
                                            ) : <span className="text-[color:var(--color-wx-muted)]">—</span>}
                                        </td>
                                        <td className="px-5 py-3 tabular-nums text-[12.5px]">
                                            {e.mrn ?? <span className="text-[color:var(--color-wx-muted)]">pendiente</span>}
                                        </td>
                                        <td className="px-5 py-3 tabular-nums text-[color:var(--color-wx-ink-2)]">{e.documentos_count}</td>
                                        <td className="px-5 py-3 min-w-[160px]">
                                            {e.confianza != null ? (
                                                <div className="flex items-center gap-2 flex-wrap"
                                                     title={`Confianza de la declaración: ${Math.round(e.confianza)}%${e.advertencias ? ` · ${e.advertencias} advertencia${e.advertencias>1?'s':''}` : ''}`}>
                                                    <div className="w-14 h-1.5 bg-[color:var(--color-wx-paper-2)] rounded-full overflow-hidden shrink-0">
                                                        <div
                                                            className="h-full rounded-full transition-all"
                                                            style={{
                                                                width: `${Math.max(6, Math.min(100, e.confianza))}%`,
                                                                background:
                                                                    e.confianza >= 85 ? '#2E7D57' :
                                                                    e.confianza >= 60 ? '#C97D2F' : '#C0392B',
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="tabular-nums text-[12px] text-[color:var(--color-wx-ink-2)] shrink-0">{Math.round(e.confianza)}%</span>
                                                    {e.advertencias > 0 && (
                                                        <span className="wx-chip whitespace-nowrap" data-tone="warn" title={`${e.advertencias} advertencia${e.advertencias>1?'s':''} pendiente${e.advertencias>1?'s':''} de revisar`}>
                                                            <span className="dot" />{e.advertencias}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : <span className="text-[color:var(--color-wx-muted)]">—</span>}
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className="wx-chip whitespace-nowrap" data-tone={estadoTone[e.estado]}>
                                                <span className="dot" />{estadoLabel[e.estado]}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-[color:var(--color-wx-muted)] text-[12px]">{e.creado}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Piezas de contexto inferior — como el fondo del deck */}
            <section className="mt-10 grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { t: 'Inteligencia Artificial', d: 'Motor GPT-5 mini lee cada documento y estructura los datos con nivel de confianza.' },
                    { t: 'Automatización',           d: 'Elimina la introducción manual repetitiva y estandariza el proceso de tránsito.' },
                    { t: 'Trazabilidad',              d: 'Cada expediente conserva la documentación original, cambios, usuario y fecha.' },
                    { t: 'Eficiencia',                d: 'Reduce tiempos y multiplica la capacidad operativa sin ampliar recursos.' },
                ].map(x => (
                    <div key={x.t} className="wx-card p-5">
                        <div className="w-8 h-8 rounded-md bg-[color:var(--color-wx-blue)]/10 text-[color:var(--color-wx-blue)] flex items-center justify-center mb-3">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5 9-11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        <div className="text-[14px] font-bold">{x.t}</div>
                        <p className="mt-1 text-[12.5px] text-[color:var(--color-wx-ink-2)] leading-snug">{x.d}</p>
                    </div>
                ))}
            </section>
        </TransitoShell>
    );
}

function EmptyState() {
    return (
        <div className="py-16 px-8 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-[color:var(--color-wx-blue)]/10 text-[color:var(--color-wx-blue)] flex items-center justify-center mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="1.6"/></svg>
            </div>
            <div className="font-display text-[22px] font-bold mb-2">Aún no hay expedientes.</div>
            <p className="text-[color:var(--color-wx-ink-2)] max-w-[52ch] mx-auto text-[14px]">
                Crea el primero para probar el flujo completo: subida de documentos, lectura con IA y
                generación automática de la declaración de tránsito.
            </p>
            <Link href="/transito/nuevo" className="wx-btn mt-6 inline-flex">Crear primer expediente</Link>
        </div>
    );
}

function PlusIcon() {
    return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
}
