import React, { useEffect, useRef } from 'react';
import { LuTriangleAlert } from 'react-icons/lu';

interface ConfirmDialogProps {
    open: boolean;
    titulo?: string;
    mensaje: string;
    variante?: 'destructiva' | 'neutra';
    textoConfirmar?: string;
    textoCancelar?: string;
    onConfirmar: () => void;
    onCancelar: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    open,
    titulo = 'Confirmar acción',
    mensaje,
    variante = 'neutra',
    textoConfirmar = 'Aceptar',
    textoCancelar = 'Cancelar',
    onConfirmar,
    onCancelar,
}) => {
    const cancelBtnRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (open) cancelBtnRef.current?.focus();
    }, [open]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancelar();
        };
        if (open) document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [open, onCancelar]);

    if (!open) return null;

    const colorAccion = variante === 'destructiva' ? '#c0392b' : '#0f6e56';
    const colorAccionHover = variante === 'destructiva' ? '#a5301f' : '#0a5544';

    return (
        <div
            onClick={onCancelar}
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(15, 20, 18, 0.45)',
                backdropFilter: 'blur(2px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                style={{
                    background: '#fff',
                    borderRadius: 12,
                    padding: '24px 28px',
                    width: '380px',
                    maxWidth: '90vw',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
                }}
            >
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 8 }}>
                    {variante === 'destructiva' && (
                        <LuTriangleAlert size={22} color={colorAccion} style={{ flexShrink: 0, marginTop: 2 }} />
                    )}
                    <div>
                        <h3 id="confirm-dialog-title" style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#222' }}>
                            {titulo}
                        </h3>
                        <p style={{ margin: '8px 0 0', fontSize: 14, color: '#555', lineHeight: 1.5 }}>
                            {mensaje}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
                    <button
                        ref={cancelBtnRef}
                        onClick={onCancelar}
                        style={{
                            padding: '8px 16px', borderRadius: 8, border: '1px solid #ddd',
                            background: '#fff', color: '#333', fontSize: 14, cursor: 'pointer',
                        }}
                    >
                        {textoCancelar}
                    </button>
                    <button
                        onClick={onConfirmar}
                        style={{
                            padding: '8px 16px', borderRadius: 8, border: 'none',
                            background: colorAccion, color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = colorAccionHover)}
                        onMouseLeave={e => (e.currentTarget.style.background = colorAccion)}
                    >
                        {textoConfirmar}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;