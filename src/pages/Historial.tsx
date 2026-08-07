import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getHistorialCompras, getDetalleCompra,
    getHistorialVentas, getDetalleVenta, anularVenta
} from '../services/api';
import type {
    CompraHistorial, DetalleCompraHistorial,
    VentaHistorial, DetalleVentaHistorial
} from '../interfaces/IHistorial';
import ReciboVenta from '../components/ReciboVenta';

type Pestana = 'compras' | 'ventas';

export default function Historial() {
    const navigate = useNavigate();
    const [pestana, setPestana] = useState<Pestana>('compras');
    const [compras, setCompras] = useState<CompraHistorial[]>([]);
    const [ventas, setVentas] = useState<VentaHistorial[]>([]);
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');
    const [soloAnuladas, setSoloAnuladas] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');

    const [modalAbierto, setModalAbierto] = useState(false);
    const [detalleCompra, setDetalleCompra] = useState<DetalleCompraHistorial[]>([]);
    const [detalleVenta, setDetalleVenta] = useState<DetalleVentaHistorial[]>([]);
    const [tituloModal, setTituloModal] = useState('');

    // Modal de anulación
    const [modalAnularAbierto, setModalAnularAbierto] = useState(false);
    const [ventaAAnular, setVentaAAnular] = useState<VentaHistorial | null>(null);
    const [motivoAnulacion, setMotivoAnulacion] = useState('');

    // Modal de comprobante
    const [reciboData, setReciboData] = useState<any>(null);

    useEffect(() => {
        cargar();
    }, [pestana, fechaDesde, fechaHasta, soloAnuladas]);

    const cargar = async () => {
        setCargando(true);
        setError('');
        try {
            if (pestana === 'compras') {
                const res = await getHistorialCompras(fechaDesde || undefined, fechaHasta || undefined);
                if (res.success) setCompras(res.data);
                else setError(res.mensaje ?? 'Error al cargar compras.');
            } else {
                const res = await getHistorialVentas(fechaDesde || undefined, fechaHasta || undefined, soloAnuladas);
                if (res.success) setVentas(res.data);
                else setError(res.mensaje ?? 'Error al cargar ventas.');
            }
        } catch (err: any) {
            setError(err.response?.data?.mensaje ?? 'Error al cargar el historial.');
        } finally {
            setCargando(false);
        }
    };

    const abrirDetalleCompra = async (compra: CompraHistorial) => {
        setTituloModal(`Compra #${compra.compraId} — ${compra.proveedor}`);
        setModalAbierto(true);
        try {
            const res = await getDetalleCompra(compra.compraId);
            if (res.success) setDetalleCompra(res.data);
        } catch {
            setDetalleCompra([]);
        }
    };

    const abrirDetalleVenta = async (venta: VentaHistorial) => {
        setTituloModal(`Venta #${venta.idVenta} — ${venta.cliente}`);
        setModalAbierto(true);
        try {
            const res = await getDetalleVenta(venta.idVenta);
            if (res.success) setDetalleVenta(res.data);
        } catch {
            setDetalleVenta([]);
        }
    };

    const abrirComprobante = async (venta: VentaHistorial) => {
        setError('');
        try {
            const res = await getDetalleVenta(venta.idVenta);
            if (res.success) {
                setReciboData({
                    idVenta: venta.idVenta,
                    fecha: venta.fechaEmision,
                    cliente: venta.cliente,
                    identificacionCliente: venta.identificacionCliente,
                    emailCliente: venta.emailCliente,
                    detalle: res.data.map(d => ({
                        producto: d.producto,
                        cantidad: d.cantidad,
                        precioUnitario: d.precioUnitario,
                        subtotal: d.subtotal
                    })),
                    subtotalIva0: venta.subtotalIva0,
                    subtotalIva15: venta.subtotalIva15,
                    montoIva: venta.montoIva,
                    total: venta.total,
                    formaPago: venta.formaPago
                });
            } else {
                setError('No se pudo cargar el comprobante.');
            }
        } catch {
            setError('No se pudo cargar el comprobante.');
        }
    };

    const continuarCompra = (compraId: number) => {
        navigate(`/compras?continuar=${compraId}`);
    };

    const abrirModalAnular = (venta: VentaHistorial) => {
        setVentaAAnular(venta);
        setMotivoAnulacion('');
        setModalAnularAbierto(true);
    };

    const confirmarAnulacion = async () => {
        if (!ventaAAnular || !motivoAnulacion.trim()) {
            setError('Debes escribir un motivo para anular la venta.');
            return;
        }
        try {
            const usuarioGuardado = localStorage.getItem('usuario');
            const usuario = usuarioGuardado ? JSON.parse(usuarioGuardado) : null;

            const usuarioId = usuario?.id || usuario?.id_usuario || undefined;
            const res = await anularVenta(ventaAAnular.idVenta, motivoAnulacion.trim(), usuarioId);
            if (res.success) {
                setModalAnularAbierto(false);
                setVentaAAnular(null);
                cargar();
            } else {
                setError(res.mensaje);
            }
        } catch (err: any) {
            setError(err.response?.data?.mensaje ?? 'Error al anular la venta.');
        }
    };

    const cerrarModal = () => {
        setModalAbierto(false);
        setDetalleCompra([]);
        setDetalleVenta([]);
    };

    return (
        <div className="clientes-wrapper">
            <div className="clientes-header">
                <h2 className="clientes-title">Historial</h2>
            </div>

            <div className="flex-row" style={{ gap: 10, marginBottom: 16 }}>
                <button
                    className="btn"
                    style={{
                        backgroundColor: pestana === 'compras' ? '#115e59' : '#f3f4f6',
                        color: pestana === 'compras' ? '#fff' : '#4b5563'
                    }}
                    onClick={() => setPestana('compras')}
                >
                    Compras
                </button>
                <button
                    className="btn"
                    style={{
                        backgroundColor: pestana === 'ventas' ? '#115e59' : '#f3f4f6',
                        color: pestana === 'ventas' ? '#fff' : '#4b5563'
                    }}
                    onClick={() => setPestana('ventas')}
                >
                    Ventas
                </button>
            </div>

            <div className="control-box" style={{ marginBottom: 16 }}>
                <div className="filters-group">
                    <div>
                        <span className="sub-label">Desde</span>
                        <input
                            type="date"
                            className="filter-select"
                            value={fechaDesde}
                            onChange={e => setFechaDesde(e.target.value)}
                        />
                    </div>
                    <div>
                        <span className="sub-label">Hasta</span>
                        <input
                            type="date"
                            className="filter-select"
                            value={fechaHasta}
                            onChange={e => setFechaHasta(e.target.value)}
                        />
                    </div>
                    {pestana === 'ventas' && (
                        <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#4b5563' }}>
                                <input
                                    type="checkbox"
                                    checked={soloAnuladas}
                                    onChange={e => setSoloAnuladas(e.target.checked)}
                                />
                                Ver solo anuladas
                            </label>
                        </div>
                    )}
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="table-container">
                {cargando ? (
                    <p className="pos-empty">Cargando...</p>
                ) : pestana === 'compras' ? (
                    compras.length === 0 ? (
                        <p className="pos-empty">No hay compras en este rango de fechas.</p>
                    ) : (
                        <table className="clientes-table">
                            <thead>
                                <tr>
                                    <th>Factura</th>
                                    <th>Fecha</th>
                                    <th>Proveedor</th>
                                    <th>Total</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {compras.map(c => (
                                    <tr key={c.compraId}>
                                        <td>{c.numeroFactura}</td>
                                        <td>{new Date(c.fechaCompra).toLocaleDateString()}</td>
                                        <td>{c.proveedor}</td>
                                        <td>${c.total.toFixed(2)}</td>
                                        <td>{c.estado}</td>
                                        <td className="actions-cell">
                                            <button className="btn-action-text" onClick={() => abrirDetalleCompra(c)}>
                                                Ver detalle
                                            </button>
                                            {c.estado === 'Pendiente' && (
                                                <button
                                                    className="btn-action-text"
                                                    style={{ color: '#ef6c00', borderColor: '#ef6c00' }}
                                                    onClick={() => continuarCompra(c.compraId)}
                                                >
                                                    Continuar
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )
                ) : ventas.length === 0 ? (
                    <p className="pos-empty">No hay ventas en este rango de fechas.</p>
                ) : (
                    <table className="clientes-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Fecha</th>
                                <th>Cliente</th>
                                <th>Total</th>
                                <th>Forma de Pago</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ventas.map(v => (
                                <tr key={v.idVenta} style={v.estadoSri === 'Anulada' ? { opacity: 0.6 } : undefined}>
                                    <td>{v.idVenta}</td>
                                    <td>{new Date(v.fechaEmision).toLocaleDateString()}</td>
                                    <td>{v.cliente}</td>
                                    <td>${v.total.toFixed(2)}</td>
                                    <td>{v.formaPago}</td>
                                    <td>
                                        <span style={{
                                            color: v.estadoSri === 'Anulada' ? '#ef4444' : '#16a34a',
                                            fontWeight: 600,
                                            fontSize: 12
                                        }}>
                                            {v.estadoSri === 'Anulada' ? 'Anulada' : v.estadoSri}
                                        </span>
                                        {v.estadoSri === 'Anulada' && v.motivoAnulacion && (
                                            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                                                {v.motivoAnulacion}
                                            </div>
                                        )}
                                    </td>
                                    <td className="actions-cell">
                                        <button className="btn-action-text" onClick={() => abrirDetalleVenta(v)}>
                                            Ver detalle
                                        </button>
                                        <button className="btn-action-text" onClick={() => abrirComprobante(v)}>
                                            Ver comprobante
                                        </button>
                                        {v.estadoSri !== 'Anulada' && (
                                            <button
                                                className="btn-action-text"
                                                style={{ color: '#ef4444', borderColor: '#ef4444' }}
                                                onClick={() => abrirModalAnular(v)}
                                            >
                                                Anular
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal de detalle */}
            {modalAbierto && (
                <div className="modal-overlay" onClick={cerrarModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{tituloModal}</h2>
                            <button className="btn-close" onClick={cerrarModal}>✕</button>
                        </div>
                        <div className="modal-body">
                            {pestana === 'compras' ? (
                                detalleCompra.length === 0 ? (
                                    <p className="pos-empty">Sin líneas registradas.</p>
                                ) : (
                                    <table className="clientes-table">
                                        <thead>
                                            <tr>
                                                <th>Producto</th>
                                                <th>Cant.</th>
                                                <th>Costo</th>
                                                <th>Lote</th>
                                                <th>Vencimiento</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {detalleCompra.map(d => (
                                                <tr key={d.compraDetalleId}>
                                                    <td>{d.producto}</td>
                                                    <td>{d.cantidad}</td>
                                                    <td>${d.costoUnitario.toFixed(2)}</td>
                                                    <td>{d.codigoLote ?? '—'}</td>
                                                    <td>{d.fechaVencimiento ? new Date(d.fechaVencimiento).toLocaleDateString() : '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )
                            ) : detalleVenta.length === 0 ? (
                                <p className="pos-empty">Sin líneas registradas.</p>
                            ) : (
                                <table className="clientes-table">
                                    <thead>
                                        <tr>
                                            <th>Producto</th>
                                            <th>Cant.</th>
                                            <th>Precio</th>
                                            <th>Lote</th>
                                            <th>Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {detalleVenta.map(d => (
                                            <tr key={d.idDetalle}>
                                                <td>{d.producto}</td>
                                                <td>{d.cantidad}</td>
                                                <td>${d.precioUnitario.toFixed(2)}</td>
                                                <td>{d.codigoLote ?? '—'}</td>
                                                <td>${d.subtotal.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancelar" onClick={cerrarModal}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de anulación */}
            {modalAnularAbierto && ventaAAnular && (
                <div className="modal-overlay" onClick={() => setModalAnularAbierto(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
                        <div className="modal-header">
                            <h2>Anular Venta #{ventaAAnular.idVenta}</h2>
                            <button className="btn-close" onClick={() => setModalAnularAbierto(false)}>✕</button>
                        </div>

                        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
                            Esta acción devolverá el stock de los productos vendidos a su lote correspondiente.
                            Esta operación no se puede deshacer.
                        </p>

                        <div className="form-group">
                            <label className="form-label">Motivo de anulación *</label>
                            <textarea
                                className="form-input"
                                rows={3}
                                value={motivoAnulacion}
                                onChange={e => setMotivoAnulacion(e.target.value)}
                                placeholder="Ej: Cliente devolvió el producto, error en la factura, etc."
                            />
                        </div>

                        <div className="modal-footer">
                            <button className="btn-cancelar" onClick={() => setModalAnularAbierto(false)}>
                                Cancelar
                            </button>
                            <button
                                className="btn-guardar"
                                style={{ backgroundColor: '#ef4444' }}
                                onClick={confirmarAnulacion}
                                disabled={!motivoAnulacion.trim()}
                            >
                                Confirmar Anulación
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de comprobante */}
            {reciboData && (
                <ReciboVenta
                    {...reciboData}
                    onCerrar={() => setReciboData(null)}
                />
            )}
        </div>
    );
}