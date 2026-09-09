import { Link, usePage, router } from '@inertiajs/react';
import { PropsWithChildren, ReactNode, useEffect, useState } from 'react';

interface AuthUser { id: number; name: string; email: string }
interface PageShared { auth: { user: AuthUser | null } }

interface Props {
    section?: 'inicio' | 'transito' | 'exportacion' | 'importacion' | 'ajustes';
    breadcrumb?: ReactNode;
    actions?: ReactNode;
}

/**
 * Shell interior — sidebar navy con marca Wixia y nav de módulos + operativa,
 * top bar blanco con breadcrumb + acciones + chip de usuario. En pantallas
 * <lg se colapsa a un drawer que se abre con el botón hamburguesa.
 */
export default function TransitoShell({
    section = 'transito',
    breadcrumb,
    actions,
    children,
}: PropsWithChildren<Props>) {
    const { auth } = usePage<PageShared>().props;
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Cerrar drawer al navegar
    useEffect(() => {
        const off = router.on('navigate', () => setDrawerOpen(false));
        return () => off();
    }, []);

    // Bloquear scroll del body cuando el drawer está abierto
    useEffect(() => {
        document.body.style.overflow = drawerOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [drawerOpen]);

    return (
        <div className="min-h-screen flex bg-[color:var(--color-wx-paper-2)] text-[color:var(--color-wx-navy)]">
            {/* Sidebar desktop */}
            <aside className="hidden lg:flex w-[248px] shrink-0 flex-col bg-[color:var(--color-wx-navy)] text-white">
                <Sidebar section={section} auth={auth} />
            </aside>

            {/* Drawer móvil */}
            {drawerOpen && (
                <>
                    <div
                        className="lg:hidden fixed inset-0 z-40 bg-black/50"
                        onClick={() => setDrawerOpen(false)}
                        aria-hidden="true"
                    />
                    <aside
                        role="dialog"
                        aria-modal="true"
                        className="lg:hidden fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] flex flex-col bg-[color:var(--color-wx-navy)] text-white shadow-2xl"
                    >
                        <button
                            onClick={() => setDrawerOpen(false)}
                            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-white/60 hover:text-white"
                            aria-label="Cerrar menú"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                        </button>
                        <Sidebar section={section} auth={auth} />
                    </aside>
                </>
            )}

            <div className="flex-1 min-w-0 flex flex-col">
                <header className="bg-white border-b border-[color:var(--color-wx-rule)] px-4 sm:px-6 lg:px-10 py-3 sm:py-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        {/* Botón hamburguesa mobile */}
                        <button
                            className="lg:hidden -ml-1 w-9 h-9 flex items-center justify-center rounded-md hover:bg-[color:var(--color-wx-paper-2)]"
                            onClick={() => setDrawerOpen(true)}
                            aria-label="Abrir menú"
                            aria-expanded={drawerOpen}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                        </button>

                        <Link href="/transito" className="lg:hidden flex items-center gap-2 shrink-0">
                            <div className="w-7 h-7 rounded-md bg-[color:var(--color-wx-blue)] relative">
                                <svg viewBox="0 0 24 24" className="absolute inset-0 m-auto w-4 h-4 text-white">
                                    <path fill="currentColor" d="M13 5h-2v6H5v2h6v6h2v-6h6v-2h-6z" />
                                </svg>
                            </div>
                            <span className="font-display text-[17px] font-bold leading-none">wix<span className="text-[color:var(--color-wx-blue)]">ia</span></span>
                        </Link>

                        {/* Breadcrumb — ocultamos el "Módulo Tránsito" en mobile para que solo se vea la referencia */}
                        <nav className="hidden sm:flex text-[13px] text-[color:var(--color-wx-muted)] items-center gap-2 min-w-0 truncate">
                            <Link href="/transito" className="hover:text-[color:var(--color-wx-navy)] transition">Módulo Tránsito</Link>
                            {breadcrumb && (
                                <>
                                    <span className="text-[color:var(--color-wx-rule)]">/</span>
                                    <span className="truncate text-[color:var(--color-wx-navy)] font-medium">{breadcrumb}</span>
                                </>
                            )}
                        </nav>
                        {breadcrumb && (
                            <span className="sm:hidden text-[12px] text-[color:var(--color-wx-navy)] font-medium truncate">
                                {breadcrumb}
                            </span>
                        )}
                    </div>

                    {actions && (
                        <div className="flex items-center gap-2 shrink-0">
                            {actions}
                        </div>
                    )}
                </header>

                <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 sm:py-8 lg:py-10 max-w-[1400px] w-full">
                    {children}
                </main>
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------- */
/* Sidebar reutilizable (desktop + drawer móvil)                        */
/* -------------------------------------------------------------------- */

function Sidebar({ section, auth }: { section: Props['section']; auth: PageShared['auth'] }) {
    return (
        <>
            <div className="px-6 pt-7 pb-6">
                <Link href="/" className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-md bg-[color:var(--color-wx-blue)] relative">
                        <svg viewBox="0 0 24 24" className="absolute inset-0 m-auto w-5 h-5 text-white">
                            <path fill="currentColor" d="M13 5h-2v6H5v2h6v6h2v-6h6v-2h-6z" />
                        </svg>
                    </div>
                    <div>
                        <div className="font-display text-[20px] font-bold leading-none">wix<span className="text-[color:var(--color-wx-blue)]">ia</span></div>
                        <div className="text-[9px] text-white/50 tracking-wider uppercase mt-0.5">Ops Intelligence</div>
                    </div>
                </Link>
            </div>

            <div className="px-4 pt-2 pb-3 text-[10px] uppercase tracking-widest text-white/40">Operativa</div>
            <nav className="px-3 space-y-0.5 text-[13.5px]">
                <NavItem icon={IconGrid}   href="/transito"         title="Panel"          active={section === 'inicio' || section === 'transito'} />
                <NavItem icon={IconFolder} href="/transito/nuevo"   title="Nuevo expediente" />
                <NavItem icon={IconCog}    href="/settings/profile" title="Ajustes" />
            </nav>

            <div className="px-4 pt-6 pb-3 text-[10px] uppercase tracking-widest text-white/40">Módulos</div>
            <nav className="px-3 space-y-0.5 text-[13.5px]">
                <ModItem n="01" href="/transito" title="Tránsito"    active={section === 'transito'} />
                <ModItem n="02" href="#" disabled title="Exportación" />
                <ModItem n="03" href="#" disabled title="Importación" />
            </nav>

            <div className="mt-auto px-4 pt-6 pb-6 border-t border-white/10">
                {auth?.user && (
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[color:var(--color-wx-blue)] flex items-center justify-center text-[12px] font-bold shrink-0">
                            {auth.user.name.split(' ').map(p => p[0]).slice(0,2).join('')}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-[13px] leading-tight truncate">{auth.user.name}</div>
                            <div className="text-[10.5px] text-white/50 leading-tight truncate">Operador de aduanas</div>
                        </div>
                        <button
                            onClick={() => router.post('/logout')}
                            className="text-white/60 hover:text-white shrink-0"
                            title="Cerrar sesión"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}

function NavItem({
    icon: Icon, href, title, active, disabled, badge,
}: {
    icon: (p: { className?: string }) => JSX.Element;
    href: string; title: string;
    active?: boolean; disabled?: boolean; badge?: string;
}) {
    const cls = [
        'group flex items-center gap-3 px-3 py-2.5 rounded-[6px] transition-colors',
        active ? 'bg-[color:var(--color-wx-blue)] text-white' : 'text-white/75 hover:bg-white/6 hover:text-white',
        disabled ? 'opacity-40 pointer-events-none' : '',
    ].join(' ');
    const inner = (
        <>
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1">{title}</span>
            {badge && (
                <span className={[
                    'text-[10px] px-1.5 py-0.5 rounded-md tabular-nums',
                    active ? 'bg-white/25 text-white' : 'bg-white/10 text-white/60',
                ].join(' ')}>{badge}</span>
            )}
        </>
    );
    return disabled ? <div className={cls}>{inner}</div> : <Link href={href} className={cls}>{inner}</Link>;
}

function ModItem({ n, href, title, active, disabled }: { n: string; href: string; title: string; active?: boolean; disabled?: boolean; }) {
    const cls = [
        'group flex items-center gap-3 px-3 py-2 rounded-[6px] transition-colors',
        active ? 'bg-white/8 text-white' : 'text-white/70 hover:bg-white/6 hover:text-white',
        disabled ? 'opacity-45 pointer-events-none' : '',
    ].join(' ');
    const inner = (
        <>
            <span className={[
                'w-6 h-6 rounded-[4px] flex items-center justify-center text-[10px] font-bold shrink-0',
                active ? 'bg-[color:var(--color-wx-blue)] text-white' : 'bg-white/10 text-white/60',
            ].join(' ')}>{n}</span>
            <span className="flex-1">{title}</span>
            {active && <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--color-wx-blue)]" />}
            {disabled && <span className="text-[10px] text-white/40">Fase futura</span>}
        </>
    );
    return disabled ? <div className={cls}>{inner}</div> : <Link href={href} className={cls}>{inner}</Link>;
}

/* --- iconos línea 1.6 --- */
type IProps = { className?: string };
const IconGrid   = (p: IProps) => <svg viewBox="0 0 24 24" fill="none" className={p.className}><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6"/></svg>;
const IconFolder = (p: IProps) => <svg viewBox="0 0 24 24" fill="none" className={p.className}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="1.6"/></svg>;
const IconCog    = (p: IProps) => <svg viewBox="0 0 24 24" fill="none" className={p.className}><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
