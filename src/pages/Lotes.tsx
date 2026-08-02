import React, { useState, useEffect } from 'react';
import { LuSearch, LuPencil, LuTrash2 } from "react-icons/lu";
import api from '../services/api';
import '../App.css';

const Lotes: React.FC = () => {
    const [lotes, setLotes] = useState<any[]>([]);
    const [busqueda, setBusqueda] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [mensaje, setMensaje] = useState<string | null>(null);

    const [loteEditando, setLoteEditando] = useState<any | null>(null);
    const [guardando, setGuardando] = useState(false);
    const [errorModal, setErrorModal] = useState<string | null>(null);

    const [loteAEliminar, setLoteAEliminar] = useState<any | null>(null);
    const [eliminando, setEliminando] = useState(false);

    const cargarLotes = async () => {
        try {
            const res = await api.get('/lotes/Listar');
            if (res.data.success) {
                setLotes(res.data.data);
            }
        } catch (err) {
            setError("Error al cargar los lotes.");
        }
    };

    useEffect(() => {
        cargarLotes();
    }, []);

    const lotesFiltrados = lotes.filter(l => {
        const termino = busqueda.toLowerCase();
        return (
            (l.nombreProducto?.toLowerCase() || '').includes(termino) ||
            (l.codigoLote?.toLowerCase() || '').includes(termino)
        );
    });

    const abrirEdicion = (lote: any) => {
        setErrorModal(null);
        setLoteEditando({
            idLote: lote.idLote,
            codigoLote: lote.codigoLote,
            fechaElaboracion: lote.fechaElaboracion ? lote.fechaElaboracion.substring(0, 10) : '',
            fechaVencimiento: lote.fechaVencimiento.substring(0, 10),
            stockRestante: lote.stockRestante
        });
    };

    const guardarEdicion = async () => {
        if (!loteEditando) return;
        setErrorModal(null);

        if (!loteEditando.codigoLote.trim()) {
            setErrorModal('El código de lote no puede estar vacío.');
            return;
        }
        if (!loteEditando.fechaVencimiento) {
            setErrorModal('La fecha de vencimiento es obligatoria.');
            return;
        }
        if (loteEditando.stockRestante < 0) {
            setErrorModal('El stock restante no puede ser negativo.');
            return;
        }

        setGuardando(true);
        try {
            const res = await api.put('/lotes/Actualizar', {
                idLote: loteEditando.idLote,
                codigoLote: loteEditando.codigoLote,
                fechaElaboracion: loteEditando.fechaElaboracion || null,
                fechaVencimiento: loteEditando.fechaVencimiento,
                stockRestante: Number(loteEditando.stockRestante)
            });

            if (res.data.success) {
                setMensaje('Lote actualizado correctamente.');
                setLoteEditando(null);
                cargarLotes();
                setTimeout(() => setMensaje(null), 3000);
            } else {
                setErrorModal(res.data.mensaje ?? 'No se pudo actualizar el lote.');
            }
        } catch (err: any) {
            setErrorModal(err.response?.data?.mensaje ?? 'Error al actualizar el lote.');
        } finally {
            setGuardando(false);
        }
    };

    const eliminarLote = async () => {
        if (!loteAEliminar) return;
        setEliminando(true);
        try {
            const res = await api.delete(`/lotes/Eliminar/${loteAEliminar.idLote}`);
            if (res.data.success) {
                setMensaje(res.data.mensaje);
                setLoteAEliminar(null);
                cargarLotes();
                setTimeout(() => setMensaje(null), 3000);
            } else {
                setError(res.data.mensaje ?? 'No se pudo eliminar el lote.');
                setLoteAEliminar(null);
            }
        } catch (err: any) {
            setError(err.response?.data?.mensaje ?? 'Error al eliminar el lote.');
            setLoteAEliminar(null);
        } finally {
            setEliminando(false);
        }
    };

    return (
        <div className="clientes-wrapper">
            <div className="clientes-header">
                <h1 className="clientes-title">Gestión de Lotes</h1>
            </div>

            {error && <div className="error-message" style={{ color: 'red' }}>{error}</div>}
            {mensaje && <div className="success-message" style={{ marginBottom: 10 }}>{mensaje}</div>}

            <div className="clientes-controls">
                <div className="control-box flex-grow">
                    <span className="control-label">Búsqueda Inteligente</span>
                    <div className="search-input-group">
                        <input
                            type="text"
                            placeholder="Buscar por Producto o Código de Lote..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                        <button className="btn" type="button"><LuSearch /></button>
                    </div>
                </div>
            </div>

            <div className="table-container">
                <table className="clientes-table">
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Código Lote</th>
                            <th>Vencimiento</th>
                            <th>Stock Restante</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lotesFiltrados.length > 0 ? (
                            lotesFiltrados.map(l => (
                                <tr key={l.idLote}>
                                    <td>{l.nombreProducto}</td>
                                    <td>{l.codigoLote}</td>
                                    <td>{new Date(l.fechaVencimiento).toLocaleDateString()}</td>
                                    <td>{l.stockRestante}</td>
                                    <td>
                                        <button className="btn-icon" title="Editar lote" onClick={() => abrirEdicion(l)}>
                                            <LuPencil size={16} />
                                        </button>
                                        <button className="btn-icon delete" title="Eliminar lote" onClick={() => setLoteAEliminar(l)}>
                                            <LuTrash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center' }}>No se encontraron lotes.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {loteEditando && (
                <div className="modal-overlay" onClick={() => setLoteEditando(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Editar Lote</h2>
                            <button className="btn-close" onClick={() => setLoteEditando(null)}>✕</button>
                        </div>

                        {errorModal && <div className="error-message" style={{ marginBottom: 10 }}>{errorModal}</div>}

                        <div className="form-grid">
                            <div className="form-group full-width">
                                <label className="form-label">Código de Lote</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={loteEditando.codigoLote}
                                    onChange={e => setLoteEditando({ ...loteEditando, codigoLote: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Fecha Elaboración (opcional)</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={loteEditando.fechaElaboracion}
                                    onChange={e => setLoteEditando({ ...loteEditando, fechaElaboracion: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Fecha Vencimiento</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={loteEditando.fechaVencimiento}
                                    onChange={e => setLoteEditando({ ...loteEditando, fechaVencimiento: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Stock Restante</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="form-input"
                                    value={loteEditando.stockRestante}
                                    onChange={e => setLoteEditando({ ...loteEditando, stockRestante: e.target.value })}
                                />
                            </div>
                        </div>

                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
                            El producto y su código de barras no se pueden cambiar aquí — si el lote quedó
                            asignado al producto equivocado, bórralo y créalo de nuevo.
                        </p>

                        <div className="modal-footer">
                            <button type="button" className="btn-cancelar" onClick={() => setLoteEditando(null)}>
                                Cancelar
                            </button>
                            <button type="button" className="btn-guardar" disabled={guardando} onClick={guardarEdicion}>
                                {guardando ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {loteAEliminar && (
                <div className="modal-overlay" onClick={() => setLoteAEliminar(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <div className="modal-header">
                            <h2>Eliminar Lote</h2>
                            <button className="btn-close" onClick={() => setLoteAEliminar(null)}>✕</button>
                        </div>
                        <p>
                            ¿Seguro que quieres eliminar el lote <strong>{loteAEliminar.codigoLote}</strong> de{' '}
                            <strong>{loteAEliminar.nombreProducto}</strong>?
                        </p>
                        <p style={{ fontSize: 12, color: '#9ca3af' }}>
                            Si este lote ya tiene ventas registradas, no se borrará — se desactivará
                            para conservar el historial.
                        </p>
                        <div className="modal-footer">
                            <button type="button" className="btn-cancelar" onClick={() => setLoteAEliminar(null)}>
                                Cancelar
                            </button>
                            <button type="button" className="btn-guardar" style={{ background: '#dc2626' }} disabled={eliminando} onClick={eliminarLote}>
                                {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Lotes;