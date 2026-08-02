import { useState } from 'react';
import { OPCIONES_UNIDAD_PESO, convertirAUnidadesDeStock } from '../utils/unidadesConversion';

interface SelectorCantidadPesoProps {
    // Cantidad ya expresada en "unidades de stock" (1 unidad = 1 quintal) — lo
    // que este componente reporta hacia afuera, y lo que ya espera el resto
    // del sistema (stockActual, cálculo de subtotal, etc.)
    onCambiar: (cantidadEnUnidadesDeStock: number) => void;
    valorInicialUnidadesDeStock?: number;
    disabled?: boolean;
}

export default function SelectorCantidadPeso({
    onCambiar,
    valorInicialUnidadesDeStock = 0,
    disabled,
}: SelectorCantidadPesoProps) {
    // Empieza en "Quintal" porque 1 quintal = 1 unidad de stock, así que si el
    // usuario no toca el selector, se comporta igual que el input simple de antes.
    const [unidadId, setUnidadId] = useState('qq');
    const [cantidadMostrada, setCantidadMostrada] = useState<number>(valorInicialUnidadesDeStock);

    const emitirCambio = (nuevaCantidad: number, nuevaUnidad: string) => {
        onCambiar(convertirAUnidadesDeStock(nuevaCantidad, nuevaUnidad));
    };

    const cantidadEnUnidadesDeStock = convertirAUnidadesDeStock(cantidadMostrada, unidadId);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', gap: 6 }}>
                <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={cantidadMostrada}
                    disabled={disabled}
                    onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        const cantidadValida = isNaN(val) ? 0 : val;
                        setCantidadMostrada(cantidadValida);
                        emitirCambio(cantidadValida, unidadId);
                    }}
                    className="form-input"
                    style={{ width: 70, fontSize: 13, padding: '4px 6px' }}
                />
                <select
                    value={unidadId}
                    disabled={disabled}
                    onChange={(e) => {
                        setUnidadId(e.target.value);
                        emitirCambio(cantidadMostrada, e.target.value);
                    }}
                    className="form-input"
                    style={{ fontSize: 12, padding: '4px 6px' }}
                >
                    {OPCIONES_UNIDAD_PESO.map(u => (
                        <option key={u.id} value={u.id}>{u.label}</option>
                    ))}
                </select>
            </div>
            {unidadId !== 'qq' && cantidadMostrada > 0 && (
                <span style={{ fontSize: 11, color: '#6c757d' }}>
                    = {cantidadEnUnidadesDeStock.toFixed(3)} quintales
                </span>
            )}
        </div>
    );
}