import { useState, useEffect } from 'react';
import { OPCIONES_UNIDAD_PESO, convertirAUnidadesDeStock } from '../utils/unidadesConversion';

interface SelectorCantidadPesoProps {
    onCambiar: (cantidadEnUnidadesDeStock: number, cantidadMostrar?: number, unidadMostrar?: string) => void;
    valorInicialUnidadesDeStock?: number;
    disabled?: boolean;
}

export default function SelectorCantidadPeso({
    onCambiar,
    valorInicialUnidadesDeStock = 0,
    disabled,
}: SelectorCantidadPesoProps) {

    const [unidadId, setUnidadId] = useState('qq');
    const [valorTexto, setValorTexto] = useState<string>(valorInicialUnidadesDeStock.toString());
    const [ultimoValorEmitido, setUltimoValorEmitido] = useState<number>(valorInicialUnidadesDeStock);

    useEffect(() => {
        if (valorInicialUnidadesDeStock !== ultimoValorEmitido) {
            setUltimoValorEmitido(valorInicialUnidadesDeStock);

            // Solo forzamos el reset a quintales si el padre nos manda una orden directa
            // (ej: si superas el stock máximo). Al borrar, como ya no enviamos "0", esto no se disparará.
            setUnidadId('qq');
            setValorTexto(valorInicialUnidadesDeStock.toString());
        }
    }, [valorInicialUnidadesDeStock, ultimoValorEmitido]);

    const emitirCambio = (nuevaCantidadTexto: string, nuevaUnidad: string) => {
        const fallback = nuevaCantidadTexto === '' ? 0 : parseFloat(nuevaCantidadTexto.replace(',', '.'));
        const cantidadValida = isNaN(fallback) ? 0 : fallback;
        const enUnidadesDeStock = convertirAUnidadesDeStock(cantidadValida, nuevaUnidad);

        setUltimoValorEmitido(enUnidadesDeStock);
        onCambiar(enUnidadesDeStock, cantidadValida, nuevaUnidad);
    };

    const handleCambioInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const texto = e.target.value;

        // 1. LA MAGIA ESTÁ AQUÍ: Si borra todo, limpiamos la pantalla pero NO avisamos a Ventas.tsx
        // De esta manera, no nos peleamos con el estado global y te deja tipear.
        if (texto === '') {
            setValorTexto('');
            return;
        }

        // 2. Validación Regex estricta
        if (unidadId === 'qq') {
            if (!/^\d+$/.test(texto)) return;
        } else {
            if (!/^\d+([.,]\d{0,2})?$/.test(texto)) return;
        }

        // 3. Actualizamos la vista local
        setValorTexto(texto);

        // 4. Emitimos al padre solo si es un número válido (no terminando en coma)
        if (!texto.endsWith('.') && !texto.endsWith(',')) {
            emitirCambio(texto, unidadId);
        }
    };

    const handleBlur = () => {
        // Si haces clic fuera del input y lo dejaste vacío, lo regresamos a 1 automáticamente
        // para que no se quede con un valor bugeado, ya que Ventas.tsx requiere al menos 1.
        if (valorTexto === '' || valorTexto.endsWith('.') || valorTexto.endsWith(',')) {
            const fallback = valorTexto === '' ? '1' : parseFloat(valorTexto.replace(',', '.')).toString();
            const valorFinal = fallback === 'NaN' ? '1' : fallback;
            setValorTexto(valorFinal);
            emitirCambio(valorFinal, unidadId);
        }
    };

    const handleCambioUnidad = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const nuevaUnidad = e.target.value;
        let nuevoValorTexto = valorTexto;

        if (nuevaUnidad === 'qq' && (valorTexto.includes('.') || valorTexto.includes(','))) {
            const valorNumerico = parseInt(valorTexto.replace(',', '.'));
            nuevoValorTexto = isNaN(valorNumerico) ? '1' : valorNumerico.toString();
            setValorTexto(nuevoValorTexto);
        }

        setUnidadId(nuevaUnidad);
        emitirCambio(nuevoValorTexto, nuevaUnidad);
    };

    const cantidadNumericaActual = parseFloat(valorTexto.replace(',', '.')) || 0;
    const stockLocalCalculado = convertirAUnidadesDeStock(cantidadNumericaActual, unidadId);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', gap: 6 }}>
                <input
                    type="text"
                    disabled={disabled}
                    value={valorTexto}
                    onChange={handleCambioInput}
                    onBlur={handleBlur}
                    className="form-input"
                    style={{ width: 70, fontSize: 13, padding: '4px 6px' }}
                />
                <select
                    value={unidadId}
                    disabled={disabled}
                    onChange={handleCambioUnidad}
                    className="form-input"
                    style={{ fontSize: 12, padding: '4px 6px' }}
                >
                    {OPCIONES_UNIDAD_PESO.map(u => (
                        <option key={u.id} value={u.id}>{u.label}</option>
                    ))}
                </select>
            </div>
            {unidadId !== 'qq' && cantidadNumericaActual > 0 && (
                <span style={{ fontSize: 11, color: '#6c757d' }}>
                    = {stockLocalCalculado.toFixed(3)} quintales
                </span>
            )}
        </div>
    );
}