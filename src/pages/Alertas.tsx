import { useState, useEffect } from 'react';
import { getLotesProximosAVencer, getStockBajo } from '../services/api';
import type { LoteProximoVencer, StockBajo } from '../interfaces/IAlerta';

export default function Alertas() {
    const [lotes, setLotes] = useState<LoteProximoVencer[]>([]);
    const [stockBajo, setStockBajo] = useState<StockBajo[]>([]);
    const [diasFiltro, setDiasFiltro] = useState<number>(30);
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        cargarDatos();
    }, [diasFiltro]);

    const cargarDatos = async () => {
        setCargando(true);
        setError('');
        try {
            const [resLotes, resStock] = await Promise.all([
                getLotesProximosAVencer(diasFiltro),
                getStockBajo()
            ]);

            if (resLotes.success) setLotes(resLotes.data);
            else setError(resLotes.mensaje ?? 'Error al cargar lotes próximos a vencer.');

            if (resStock.success) setStockBajo(resStock.data);
            else setError(prev => prev || (resStock.mensaje ?? 'Error al cargar stock bajo.'));
        } catch (err: any) {
            setError(err.response?.data?.mensaje ?? 'Error al cargar las alertas.');
        } finally {
            setCargando(false);
        }
    };

    const colorDias = (dias: number) => {
        if (dias <= 7) return 'dot-red';
        if (dias <= 15) return 'dot-yellow';
        return 'dot-green';
    };

    return (
        <div className="dashboard-wrapper">
            <div className="dashboard-header">
                <h1 className="dashboard-title">Alertas</h1>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 20 }}>
                <div className="dash-card">
                    <div className="flex-row" style={{ justifyContent: 'space-between', marginBottom: 15 }}>
                        <h3 className="card-title" style={{ margin: 0 }}>Lotes próximos a vencer</h3>
                        <select
                            className="filter-select"
                            value={diasFiltro}
                            onChange={e => setDiasFiltro(Number(e.target.value))}
                        >
                            <option value={7}>Próximos 7 días</option>
                            <option value={15}>Próximos 15 días</option>
                            <option value={30}>Próximos 30 días</option>
                            <option value={60}>Próximos 60 días</option>
                        </select>
                    </div>

                    {cargando ? (
                        <p className="pos-empty">Cargando...</p>
                    ) : lotes.length === 0 ? (
                        <p className="pos-empty">No hay lotes próximos a vencer.</p>
                    ) : (
                        <ul className="status-list">
                            {lotes.map(l => (
                                <li key={l.idLote}>
                                    <span className={`dot ${colorDias(l.diasRestantes)}`}></span>
                                    <strong>{l.producto}</strong>&nbsp;— Lote {l.codigoLote}
                                    &nbsp;· vence {new Date(l.fechaVencimiento).toLocaleDateString()}
                                    &nbsp;({l.diasRestantes} días) · Stock: {l.stockRestante}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="dash-card">
                    <h3 className="card-title">Productos con stock bajo</h3>

                    {cargando ? (
                        <p className="pos-empty">Cargando...</p>
                    ) : stockBajo.length === 0 ? (
                        <p className="pos-empty">Todos los productos están sobre su stock mínimo.</p>
                    ) : (
                        <ul className="data-list">
                            {stockBajo.map(s => (
                                <li key={s.idProducto}>
                                    <span>{s.nombre}</span>
                                    <span>{s.stockActual} / mín. {s.stockMinimo} (faltan {s.cantidadFaltante})</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <div className="table-container">
                <h3 className="card-title">Detalle de lotes próximos a vencer</h3>
                <table className="clientes-table">
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Código de Lote</th>
                            <th>Fecha Vencimiento</th>
                            <th>Días Restantes</th>
                            <th>Stock Restante</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lotes.map(l => (
                            <tr key={l.idLote}>
                                <td>{l.producto}</td>
                                <td>{l.codigoLote}</td>
                                <td>{new Date(l.fechaVencimiento).toLocaleDateString()}</td>
                                <td>
                                    <span className={`dot ${colorDias(l.diasRestantes)}`}></span>
                                    &nbsp;{l.diasRestantes} días
                                </td>
                                <td>{l.stockRestante}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}