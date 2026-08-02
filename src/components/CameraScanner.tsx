import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface CameraScannerProps {
    onScan: (codigo: string) => void;
    onClose: () => void;
}

export default function CameraScanner({ onScan, onClose }: CameraScannerProps) {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const detenidoRef = useRef(false);

    useEffect(() => {
        const scanner = new Html5Qrcode('camera-reader');
        scannerRef.current = scanner;
        detenidoRef.current = false;

        scanner.start(
            { facingMode: 'environment' }, // cámara trasera
            { fps: 10, qrbox: { width: 250, height: 150 } },
            (decodedText) => {
                if (detenidoRef.current) return;
                detenidoRef.current = true;
                onScan(decodedText);
                scanner.stop().catch(() => { });
            },
            () => { } // errores de frame, se ignoran (normal mientras enfoca)
        ).catch((err) => console.error('No se pudo iniciar la cámara:', err));

        return () => {
            if (!detenidoRef.current) {
                scannerRef.current?.stop().catch(() => { });
            }
        };
    }, [onScan]);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 340, textAlign: 'center' }}>
                <div className="modal-header">
                    <h2>Escanear producto</h2>
                    <button className="btn-close" onClick={onClose}>✕</button>
                </div>
                <p style={{ fontSize: 13, color: '#6c757d', marginBottom: 10 }}>
                    Apunta la cámara al código de barras del producto.
                </p>
                <div id="camera-reader" style={{ width: '100%', borderRadius: 8, overflow: 'hidden' }} />
                <button className="btn-cancelar" style={{ width: '100%', marginTop: 14 }} onClick={onClose}>
                    Cancelar
                </button>
            </div>
        </div>
    );
}