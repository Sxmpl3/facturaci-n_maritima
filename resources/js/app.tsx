import { createInertiaApp } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import AuthLayout from '@/layouts/auth-layout';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';

const appName = import.meta.env.VITE_APP_NAME || 'Wixia Tránsito';

void createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        // Las páginas de Wixia (welcome + módulo tránsito) traen su propio shell.
        if (name === 'welcome' || name.startsWith('transito/')) return null;
        if (name.startsWith('auth/')) return AuthLayout;
        // Settings envuelve su propio TransitoShell — sin AppLayout externo.
        if (name.startsWith('settings/')) return SettingsLayout;
        return AppLayout;
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: { color: '#1E4FE0' },
});
