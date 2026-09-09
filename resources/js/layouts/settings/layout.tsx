import { Link } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import TransitoShell from '@/layouts/transito/shell';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { edit as editAppearance } from '@/routes/appearance';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import type { NavItem } from '@/types';

const sidebarNavItems: NavItem[] = [
    { title: 'Perfil',     href: edit(),           icon: null },
    { title: 'Seguridad',  href: editSecurity(),   icon: null },
    { title: 'Apariencia', href: editAppearance(), icon: null },
];

/**
 * Layout de Ajustes — reutiliza el TransitoShell (sidebar navy + top bar)
 * para mantener coherencia visual con el resto del módulo. Añade una
 * sub-navegación de secciones (Perfil / Seguridad / Apariencia).
 */
export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <TransitoShell section="ajustes" breadcrumb="Ajustes">
            {/* Encabezado de sección */}
            <div className="flex items-start gap-3 sm:gap-4 mb-6 sm:mb-8">
                <div className="grid grid-cols-2 gap-0.5 mt-1 sm:mt-1.5 shrink-0">
                    <span className="block w-3 h-3 sm:w-4 sm:h-4 bg-[color:var(--color-wx-block-gray)]" />
                    <span className="block w-3 h-3 sm:w-4 sm:h-4 bg-[color:var(--color-wx-blue)]" />
                    <span className="block w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="block w-3 h-3 sm:w-4 sm:h-4 bg-[color:var(--color-wx-block-dark)]" />
                </div>
                <div className="min-w-0">
                    <div className="wx-eyebrow mb-1">Configuración de cuenta</div>
                    <h1 className="font-display text-[24px] sm:text-[32px] lg:text-[38px] font-bold leading-[1.15]">
                        Ajustes
                    </h1>
                    <p className="mt-2 text-[13px] sm:text-[14px] text-[color:var(--color-wx-ink-2)]">
                        Gestiona tu perfil, seguridad y apariencia de la plataforma.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 lg:gap-10 max-w-5xl">
                {/* Sub-nav lateral */}
                <aside>
                    <nav aria-label="Secciones de ajustes" className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
                        {sidebarNavItems.map((item) => {
                            const active = isCurrentOrParentUrl(item.href);
                            return (
                                <Link
                                    key={item.title}
                                    href={item.href}
                                    className={[
                                        'px-3 py-2 rounded-[6px] text-[13.5px] whitespace-nowrap transition-colors',
                                        active
                                            ? 'bg-[color:var(--color-wx-blue)] text-white'
                                            : 'text-[color:var(--color-wx-ink-2)] hover:bg-[color:var(--color-wx-paper-2)]',
                                    ].join(' ')}
                                >
                                    {item.title}
                                </Link>
                            );
                        })}
                    </nav>
                </aside>

                {/* Contenido */}
                <section className="wx-card p-5 sm:p-7 lg:p-8">
                    <div className="max-w-xl space-y-10">{children}</div>
                </section>
            </div>
        </TransitoShell>
    );
}
