import { useEffect, useRef } from 'react';

/**
 * Hook para detectar escaneos de un lector de código de barras USB (tipo "keyboard wedge").
 * El lector escribe los caracteres muy rápido (mucho más rápido que un humano) y termina con Enter.
 *
 * IMPORTANTE: si el foco está sobre un <input> o <textarea>, el hook igual funciona, pero
 * si el usuario está escribiendo manualmente ahí (tecleo lento y humano), el buffer se
 * resetea solo por el gap de tiempo entre teclas — así no interfiere con campos normales
 * como el buscador de cliente o el precio manual.
 */
export function useBarcodeScanner(onScan: (codigo: string) => void, enabled = true) {
    const buffer = useRef('');
    const lastTime = useRef(Date.now());

    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const now = Date.now();
            const gap = now - lastTime.current;
            lastTime.current = now;

            if (e.key === 'Enter') {
                if (buffer.current.length >= 4) {
                    onScan(buffer.current);
                    e.preventDefault();
                }
                buffer.current = '';
                return;
            }

            // Si pasó demasiado tiempo entre teclas, es tecleo humano normal -> reset
            if (gap > 80 && buffer.current.length > 0) {
                buffer.current = '';
            }

            if (e.key.length === 1) {
                buffer.current += e.key;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onScan, enabled]);
}