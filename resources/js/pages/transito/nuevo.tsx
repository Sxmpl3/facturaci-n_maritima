import { Head, useForm, Link } from '@inertiajs/react';
import TransitoShell from '@/layouts/transito/shell';

interface Props { siguiente_referencia: string; }

export default function NuevoExpediente({ siguiente_referencia }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        cliente: '', aduana_partida: '', aduana_destino: '',
    });

    return (
        <TransitoShell section="transito" breadcrumb="Nuevo expediente" actions={
            <Link href="/transito" className="wx-btn wx-btn-ghost">Cancelar</Link>
        }>
            <Head title="Nuevo expediente · Wixia" />

            <div className="max-w-3xl">
                <div className="flex items-start gap-3 sm:gap-4 mb-6 sm:mb-8">
                    <span className="wx-phase shrink-0">01</span>
                    <div className="min-w-0">
                        <div className="wx-eyebrow mb-1">Fase 01 — Alta de expediente</div>
                        <h1 className="font-display text-[24px] sm:text-[30px] lg:text-[36px] font-bold leading-tight">
                            Abrir expediente de tránsito
                        </h1>
                        <p className="mt-2 text-[13px] sm:text-[14px] text-[color:var(--color-wx-ink-2)]">
                            Solo necesitamos una referencia mínima. Los datos aduaneros se completarán
                            automáticamente al analizar los documentos.
                        </p>
                    </div>
                </div>

                <div className="wx-card p-5 sm:p-6 lg:p-8">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-[color:var(--color-wx-rule)]">
                        <div>
                            <div className="text-[11px] text-[color:var(--color-wx-muted)] uppercase tracking-wider">Referencia automática</div>
                            <div className="text-[22px] font-bold tabular-nums text-[color:var(--color-wx-blue)]">{siguiente_referencia}</div>
                        </div>
                        <div className="wx-chip" data-tone="muted"><span className="dot" />Borrador</div>
                    </div>

                    <form onSubmit={(e) => { e.preventDefault(); post('/transito'); }} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2">
                            <label className="wx-label" htmlFor="cliente">Cliente o expedidor <span className="text-[color:var(--color-wx-muted)] font-normal">(opcional)</span></label>
                            <input id="cliente" className="wx-input" placeholder="Ej. Central Lechera Asturiana S.A.T."
                                   value={data.cliente} onChange={(e) => setData('cliente', e.target.value)} autoFocus />
                            {errors.cliente && <div className="mt-1 text-[12px] text-[color:var(--color-wx-error)]">{errors.cliente}</div>}
                        </div>

                        <div>
                            <label className="wx-label" htmlFor="ap">Aduana de partida</label>
                            <input id="ap" className="wx-input" placeholder="ES000811 · Gijón"
                                   value={data.aduana_partida} onChange={(e) => setData('aduana_partida', e.target.value)} />
                            {errors.aduana_partida && <div className="mt-1 text-[12px] text-[color:var(--color-wx-error)]">{errors.aduana_partida}</div>}
                        </div>
                        <div>
                            <label className="wx-label" htmlFor="ad">Aduana de destino</label>
                            <input id="ad" className="wx-input" placeholder="DE003401 · Bremen"
                                   value={data.aduana_destino} onChange={(e) => setData('aduana_destino', e.target.value)} />
                            {errors.aduana_destino && <div className="mt-1 text-[12px] text-[color:var(--color-wx-error)]">{errors.aduana_destino}</div>}
                        </div>

                        <div className="md:col-span-2 flex items-center gap-3 pt-3 border-t border-[color:var(--color-wx-rule)] mt-2">
                            <button type="submit" disabled={processing} className="wx-btn">
                                {processing ? 'Abriendo…' : 'Abrir expediente →'}
                            </button>
                            <p className="text-[12px] text-[color:var(--color-wx-muted)]">
                                Podrás cargar todos los documentos en la siguiente pantalla.
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </TransitoShell>
    );
}
