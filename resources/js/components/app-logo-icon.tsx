import type { SVGAttributes } from 'react';

/**
 * Marca de Wixia — el mismo icono azul con el "+" recortado que usamos en
 * el shell del módulo Tránsito, la landing y las pantallas de auth.
 */
export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg {...props} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M13 5h-2v6H5v2h6v6h2v-6h6v-2h-6z" />
        </svg>
    );
}
