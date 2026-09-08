import { Link } from '@inertiajs/react';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="min-h-svh flex flex-col bg-white text-[color:var(--color-wx-navy)]">
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
                {/* Panel izquierdo azul cobalto — identidad Wixia */}
                <aside className="wx-hero-blue relative overflow-hidden px-8 lg:px-14 py-10 flex flex-col justify-between text-white">
                    <HexNet />
                    <Link href="/" className="relative flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-white/15 backdrop-blur-sm relative">
                            <svg viewBox="0 0 24 24" className="absolute inset-0 m-auto w-5 h-5 text-white">
                                <path fill="currentColor" d="M13 5h-2v6H5v2h6v6h2v-6h6v-2h-6z" />
                            </svg>
                        </div>
                        <div>
                            <div className="font-display text-[22px] font-bold leading-none">wix<span className="text-white">ia</span></div>
                            <div className="text-[10px] tracking-widest uppercase text-white/70 mt-0.5">Operational Intelligence &amp; AI</div>
                        </div>
                    </Link>

                    <div className="relative">
                        <div className="text-[12px] tracking-[0.18em] uppercase text-white/70 mb-3">
                            Módulo 01 · Tránsito
                        </div>
                        <h2 className="font-display text-[34px] lg:text-[44px] font-bold leading-[1.05] max-w-[18ch]">
                            Sistema Inteligente de Gestión de Declaraciones Aduaneras
                        </h2>
                        <p className="mt-5 text-white/85 max-w-[42ch] text-[14px] leading-relaxed">
                            La plataforma que lee tu documentación aduanera y prepara la declaración de
                            tránsito lista para revisar. La validación siempre es tuya.
                        </p>
                    </div>

                    <div className="relative text-[11.5px] text-white/70">
                        © Wixia · www.wixia.es
                    </div>
                </aside>

                {/* Panel derecho — formulario */}
                <section className="flex items-center justify-center px-6 py-12 lg:px-14">
                    <div className="w-full max-w-sm">
                        <div className="lg:hidden flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 rounded-md bg-[color:var(--color-wx-blue)] relative">
                                <svg viewBox="0 0 24 24" className="absolute inset-0 m-auto w-5 h-5 text-white">
                                    <path fill="currentColor" d="M13 5h-2v6H5v2h6v6h2v-6h6v-2h-6z" />
                                </svg>
                            </div>
                            <div>
                                <div className="font-display text-[22px] font-bold leading-none">wix<span className="text-[color:var(--color-wx-blue)]">ia</span></div>
                                <div className="text-[10px] tracking-widest uppercase text-[color:var(--color-wx-muted)] mt-0.5">Ops Intelligence</div>
                            </div>
                        </div>

                        {(title || description) && (
                            <div className="mb-8">
                                {title && <h1 className="font-display text-[26px] font-bold leading-tight">{title}</h1>}
                                {description && (
                                    <p className="mt-2 text-[13.5px] text-[color:var(--color-wx-ink-2)]">{description}</p>
                                )}
                            </div>
                        )}
                        {children}
                    </div>
                </section>
            </div>
        </div>
    );
}

function HexNet() {
    return (
        <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" viewBox="0 0 1200 900" preserveAspectRatio="xMidYMid slice" fill="none">
            <defs>
                <pattern id="hex-auth" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
                    <path d="M15 2 L45 2 L60 26 L45 50 L15 50 L0 26 Z" stroke="white" strokeWidth="0.8" fill="none" opacity="0.55" />
                    <circle cx="30" cy="26" r="1.6" fill="white" opacity="0.6" />
                </pattern>
            </defs>
            <rect width="1200" height="900" fill="url(#hex-auth)" />
            {[[220, 90], [420, 200], [700, 130], [900, 340], [1100, 90], [340, 480], [820, 580], [180, 720]].map(([x,y], i) => (
                <circle key={i} cx={x} cy={y} r="3" fill="#fff" />
            ))}
        </svg>
    );
}
