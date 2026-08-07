import React, { useState, useEffect, useRef } from 'react';
import { LuClipboardList, LuSearch, LuCheck, LuHistory, LuTriangleAlert, LuChartBar } from 'react-icons/lu';
import { Link } from 'react-router-dom';
import api from '../services/api';
import '../App.css';

const MOTIVOS = ['Dañado', 'Vencido', 'Robo/pérdida', 'Error de conteo', 'Otro'];

interface DetalleItem {
    idDetalle: number;
    idProducto: number;
    nombreProducto: string;
    codigoBarras?: string;
    stockSistemaInicial: number;
    stockContado: number | null;
    stockAlContar: number | null;
    diferencia: number | null;
    motivo: string | null;
    observacionOtro: string | null;
    contadoEn: string | null;
}

interface SesionAbierta {
    idSesion: number;
    fechaInicio: string;
    nombreUsuario: string;
    observaciones?: string;
    totalProductos: number;
    productosContados: number;
}

const InventarioFisico: React.FC = () => {
    const usuarioGuardado = JSON.parse(localStorage.getItem('usuario') || '{}');

    const [vista, setVista] = useState<'inicio' | 'contando' | 'revision' | 'historial'>('inicio');
    const [sesionesAbiertas, setSesionesAbiertas] = useState<SesionAbierta[]>([]);
    const [historial, setHistorial] = useState<any[]>([]);
    const [cargando, setCargando] = useState(false);

    const [idSesionActual, setIdSesionActual] = useState<number | null>(null);
    const [detalle, setDetalle] = useState<DetalleItem[]>([]);
    const [busqueda, setBusqueda] = useState('');
    const [observacionesNueva, setObservacionesNueva] = useState('');

    const timeoutsRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
    const [guardandoIds, setGuardandoIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (vista === 'inicio') cargarSesionesAbiertas();
        if (vista === 'historial') cargarHistorial();
    }, [vista]);

    const cargarSesionesAbiertas = async () => {
        setCargando(true);
        try {
            const res = await api.get('InventarioFisico/Abiertas');
            if (res.data.success) setSesionesAbiertas(res.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setCargando(false);
        }
    };

    const cargarHistorial = async () => {
        setCargando(true);
        try {
            const res = await api.get('InventarioFisico/Historial');
            if (res.data.success) setHistorial(res.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setCargando(false);
        }
    };

    const cargarDetalle = async (idSesion: number) => {
        setCargando(true);
        try {
            const res = await api.get(`InventarioFisico/${idSesion}/Detalle`);
            if (res.data.success) {
                setDetalle(res.data.data);
                setIdSesionActual(idSesion);
                setVista('contando');
            }
        } catch (err) {
            alert('No se pudo cargar la sesión.');
        } finally {
            setCargando(false);
        }
    };

    const iniciarNuevoConteo = async () => {
        setCargando(true);
        try {
            const res = await api.post('InventarioFisico/Iniciar', {
                idUsuario: usuarioGuardado.id,
                observaciones: observacionesNueva || null
            });
            if (res.data.success) {
                setObservacionesNueva('');
                await cargarDetalle(res.data.idSesion);
            }
        } catch (err: any) {
            alert(err.response?.data?.mensaje || 'No se pudo iniciar el conteo.');
        } finally {
            setCargando(false);
        }
    };

    const guardarEnBackend = async (idProducto: number, stockContado: number, motivo: string | null, observacionOtro: string | null) => {
        setGuardandoIds(prev => new Set(prev).add(idProducto));
        try {
            await api.put('InventarioFisico/GuardarConteo', {
                idSesion: idSesionActual,
                idProducto,
                stockContado,
                motivo,
                observacionOtro
            });
        } catch (err) {
            console.error('Error al autoguardar', err);
        } finally {
            setGuardandoIds(prev => {
                const copia = new Set(prev);
                copia.delete(idProducto);
                return copia;
            });
        }
    };

    const handleCambiarConteo = (idProducto: number, valor: string) => {
        const num = valor === '' ? null : Number(valor);

        setDetalle(prev => prev.map(item =>
            item.idProducto === idProducto
                ? { ...item, stockContado: num, diferencia: num != null && item.stockAlContar != null ? num - item.stockAlContar : null }
                : item
        ));

        if (num === null || isNaN(num)) return;

        if (timeoutsRef.current[idProducto]) clearTimeout(timeoutsRef.current[idProducto]);

        timeoutsRef.current[idProducto] = setTimeout(() => {
            const item = detalle.find(d => d.idProducto === idProducto);
            guardarEnBackend(idProducto, num, item?.motivo ?? null, item?.observacionOtro ?? null);
        }, 600);
    };

    const handleCambiarMotivo = (idProducto: number, motivo: string) => {
        setDetalle(prev => prev.map(item =>
            item.idProducto === idProducto ? { ...item, motivo: motivo || null } : item
        ));
        const item = detalle.find(d => d.idProducto === idProducto);
        if (item && item.stockContado !== null) {
            guardarEnBackend(idProducto, item.stockContado, motivo || null, item.observacionOtro ?? null);
        }
    };

    const handleCambiarObservacion = (idProducto: number, texto: string) => {
        setDetalle(prev => prev.map(item =>
            item.idProducto === idProducto ? { ...item, observacionOtro: texto } : item
        ));
        if (timeoutsRef.current[idProducto + 100000]) clearTimeout(timeoutsRef.current[idProducto + 100000]);
        timeoutsRef.current[idProducto + 100000] = setTimeout(() => {
            const item = detalle.find(d => d.idProducto === idProducto);
            if (item && item.stockContado !== null) {
                guardarEnBackend(idProducto, item.stockContado, item.motivo ?? null, texto);
            }
        }, 600);
    };

    const productosFiltrados = detalle.filter(d =>
        d.nombreProducto.toLowerCase().includes(busqueda.toLowerCase()) ||
        (d.codigoBarras && d.codigoBarras.includes(busqueda))
    );

    const totalContados = detalle.filter(d => d.stockContado !== null).length;
    const productosConDiferencia = detalle.filter(d => d.stockContado !== null && d.diferencia !== 0);

    const handleCerrarSesion = async () => {
        if (!idSesionActual) return;
        setCargando(true);
        try {
            const res = await api.post(`InventarioFisico/${idSesionActual}/Cerrar`, { idUsuario: usuarioGuardado.id });
            if (res.data.success) {
                alert(res.data.mensaje);
                setVista('inicio');
                setIdSesionActual(null);
                setDetalle([]);
            }
        } catch (err: any) {
            alert(err.response?.data?.mensaje || 'No se pudo cerrar el conteo.');
        } finally {
            setCargando(false);
        }
    };

    const handleCancelarSesion = async () => {
        if (!idSesionActual) return;
        const confirmar = window.confirm('¿Cancelar este conteo? No se aplicará ningún ajuste al stock.');
        if (!confirmar) return;
        try {
            await api.post(`InventarioFisico/${idSesionActual}/Cancelar`);
            setVista('inicio');
            setIdSesionActual(null);
            setDetalle([]);
        } catch (err) {
            alert('No se pudo cancelar la sesión.');
        }
    };

    if (vista === 'inicio') {
        return (
            <div className="clientes-wrapper">
                <div className="clientes-header">
                    <h1 className="clientes-title">
                        <LuClipboardList style={{ verticalAlign: 'middle', marginRight: 8 }} />
                        Inventario Físico
                    </h1>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <Link to="/inventario/reporte-mermas" className="btn">
                            <LuChartBar style={{ marginRight: 6 }} /> Reporte de mermas
                        </Link>
                        <button className="btn" onClick={() => setVista('historial')}>
                            <LuHistory style={{ marginRight: 6 }} /> Historial
                        </button>
                    </div>
                </div>

                <div className="modal-content" style={{ maxWidth: 500, margin: '20px 0' }}>
                    <h2 style={{ marginTop: 0 }}>Iniciar nuevo conteo</h2>
                    <p style={{ fontSize: 13, color: '#6c757d' }}>
                        Se creará una lista con todos los productos activos y su stock actual del sistema,
                        para que vayas ingresando la cantidad física real de cada uno.
                    </p>
                    <div className="form-group">
                        <label className="form-label">Observaciones (opcional)</label>
                        <input
                            className="form-input"
                            value={observacionesNueva}
                            onChange={e => setObservacionesNueva(e.target.value)}
                            placeholder="Ej: Conteo mensual de agosto"
                        />
                    </div>
                    <button className="btn-guardar" onClick={iniciarNuevoConteo} disabled={cargando}>
                        {cargando ? 'Iniciando...' : 'Iniciar conteo'}
                    </button>
                </div>

                {sesionesAbiertas.length > 0 && (
                    <div className="table-container">
                        <h2 style={{ fontSize: 16 }}>Conteos en progreso — puedes continuar donde quedaste</h2>
                        <table className="clientes-table">
                            <thead>
                                <tr><th>Inicio</th><th>Usuario</th><th>Progreso</th><th>Observaciones</th><th>Acciones</th></tr>
                            </thead>
                            <tbody>
                                {sesionesAbiertas.map(s => (
                                    <tr key={s.idSesion}>
                                        <td>{new Date(s.fechaInicio).toLocaleString()}</td>
                                        <td>{s.nombreUsuario}</td>
                                        <td>{s.productosContados} / {s.totalProductos}</td>
                                        <td>{s.observaciones || '-'}</td>
                                        <td>
                                            <button className="btn-action-text" onClick={() => cargarDetalle(s.idSesion)}>Continuar</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    }

    if (vista === 'historial') {
        return (
            <div className="clientes-wrapper">
                <div className="clientes-header">
                    <h1 className="clientes-title">Historial de Conteos</h1>
                    <button className="btn" onClick={() => setVista('inicio')}>Volver</button>
                </div>
                <div className="table-container">
                    {cargando ? (
                        <p className="pos-empty">Cargando...</p>
                    ) : historial.length === 0 ? (
                        <p className="pos-empty">Aún no hay conteos cerrados.</p>
                    ) : (
                        <table className="clientes-table">
                            <thead>
                                <tr><th>Inicio</th><th>Cierre</th><th>Usuario</th><th>Estado</th><th>Productos</th><th>Con diferencia</th><th>Observaciones</th></tr>
                            </thead>
                            <tbody>
                                {historial.map(h => (
                                    <tr key={h.idSesion}>
                                        <td>{new Date(h.fechaInicio).toLocaleString()}</td>
                                        <td>{h.fechaCierre ? new Date(h.fechaCierre).toLocaleString() : '-'}</td>
                                        <td>{h.nombreUsuario}</td>
                                        <td>
                                            <span style={{ color: h.estado === 'cerrado' ? '#16a34a' : '#9ca3af', fontWeight: 600 }}>
                                                {h.estado === 'cerrado' ? 'Aplicado' : 'Cancelado'}
                                            </span>
                                        </td>
                                        <td>{h.totalProductos}</td>
                                        <td>{h.productosConDiferencia}</td>
                                        <td>{h.observaciones || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        );
    }

    if (vista === 'revision') {
        return (
            <div className="clientes-wrapper">
                <div className="clientes-header">
                    <h1 className="clientes-title">Revisar antes de aplicar</h1>
                    <button className="btn" onClick={() => setVista('contando')}>Volver al conteo</button>
                </div>

                <p style={{ fontSize: 14, color: '#4b5563' }}>
                    {totalContados} de {detalle.length} productos contados.
                    {productosConDiferencia.length > 0
                        ? ` ${productosConDiferencia.length} tienen diferencia respecto al stock en el momento en que se contaron.`
                        : ' No hay diferencias detectadas.'}
                </p>

                <div className="table-container">
                    <table className="clientes-table">
                        <thead>
                            <tr><th>Producto</th><th>Stock al contar</th><th>Contado</th><th>Diferencia</th><th>Motivo</th></tr>
                        </thead>
                        <tbody>
                            {productosConDiferencia.length === 0 ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: '#9ca3af' }}>Sin diferencias.</td></tr>
                            ) : (
                                productosConDiferencia.map(item => (
                                    <tr key={item.idProducto}>
                                        <td>{item.nombreProducto}</td>
                                        <td>{item.stockAlContar}</td>
                                        <td>{item.stockContado}</td>
                                        <td style={{ color: (item.diferencia ?? 0) > 0 ? '#16a34a' : '#ef4444', fontWeight: 700 }}>
                                            {(item.diferencia ?? 0) > 0 ? '+' : ''}{item.diferencia}
                                        </td>
                                        <td>{item.motivo || <span style={{ color: '#d1d5db' }}>Sin especificar</span>}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {detalle.length - totalContados > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FAEEDA', color: '#633806', padding: '10px 14px', borderRadius: 8, marginTop: 14, fontSize: 13 }}>
                        <LuTriangleAlert size={16} />
                        Hay {detalle.length - totalContados} productos sin contar — su stock NO se modificará.
                    </div>
                )}

                <div className="modal-footer" style={{ marginTop: 20, justifyContent: 'flex-end', gap: 10 }}>
                    <button className="btn-cancelar" onClick={() => setVista('contando')}>Cancelar</button>
                    <button className="btn-guardar" onClick={handleCerrarSesion} disabled={cargando}>
                        {cargando ? 'Aplicando...' : 'Aplicar ajustes y cerrar'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="clientes-wrapper">
            <div className="clientes-header">
                <h1 className="clientes-title">Conteo en progreso</h1>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-action-text" onClick={handleCancelarSesion}>Cancelar conteo</button>
                    <button className="btn" onClick={() => setVista('revision')}>Revisar y cerrar</button>
                </div>
            </div>

            <p style={{ fontSize: 13, color: '#6c757d' }}>
                {totalContados} de {detalle.length} productos contados. Tu progreso se guarda automáticamente
                — si sales por error, puedes continuar desde "Conteos en progreso" en la pantalla de inicio.
                La diferencia se calcula contra el stock del sistema en el momento exacto en que guardas cada
                producto, así que las ventas que ocurran mientras cuentas no se contabilizan como merma.
            </p>

            <div className="control-box" style={{ marginBottom: 12 }}>
                <div className="search-input-group">
                    <input
                        type="text"
                        placeholder="Buscar producto o código de barras..."
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                    />
                    <button className="btn"><LuSearch /></button>
                </div>
            </div>

            <div className="table-container">
                <table className="clientes-table">
                    <thead>
                        <tr><th>Producto</th><th>Stock sistema</th><th>Cantidad contada</th><th>Diferencia</th><th>Motivo (si hay diferencia)</th></tr>
                    </thead>
                    <tbody>
                        {productosFiltrados.map(item => {
                            const hayDiferencia = item.diferencia !== null && item.diferencia !== 0;
                            return (
                                <tr key={item.idProducto}>
                                    <td>{item.nombreProducto}</td>
                                    <td>{item.stockAlContar ?? item.stockSistemaInicial}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="form-input"
                                                style={{ width: 100, padding: '4px 8px' }}
                                                value={item.stockContado ?? ''}
                                                onChange={e => handleCambiarConteo(item.idProducto, e.target.value)}
                                                placeholder="—"
                                            />
                                            {guardandoIds.has(item.idProducto) && <span style={{ fontSize: 11, color: '#9ca3af' }}>guardando...</span>}
                                            {!guardandoIds.has(item.idProducto) && item.stockContado !== null && <LuCheck size={14} color="#16a34a" />}
                                        </div>
                                    </td>
                                    <td>
                                        {item.diferencia !== null && item.diferencia !== 0 ? (
                                            <span style={{ color: item.diferencia > 0 ? '#16a34a' : '#ef4444', fontWeight: 700 }}>
                                                {item.diferencia > 0 ? '+' : ''}{item.diferencia}
                                            </span>
                                        ) : item.diferencia === 0 ? (
                                            <span style={{ color: '#9ca3af' }}>Igual</span>
                                        ) : (
                                            <span style={{ color: '#d1d5db' }}>-</span>
                                        )}
                                    </td>
                                    <td>
                                        {hayDiferencia && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 150 }}>
                                                <select
                                                    className="form-input"
                                                    style={{ fontSize: 12, padding: '4px 6px' }}
                                                    value={item.motivo ?? ''}
                                                    onChange={e => handleCambiarMotivo(item.idProducto, e.target.value)}
                                                >
                                                    <option value="">Sin especificar</option>
                                                    {MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
                                                </select>
                                                {item.motivo === 'Otro' && (
                                                    <input
                                                        type="text"
                                                        className="form-input"
                                                        style={{ fontSize: 12, padding: '4px 6px' }}
                                                        placeholder="Especifica el motivo..."
                                                        value={item.observacionOtro ?? ''}
                                                        onChange={e => handleCambiarObservacion(item.idProducto, e.target.value)}
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default InventarioFisico;