import React, { useState, useEffect } from "react";
import api from "../services/api";
import type { UsuarioLogueado } from "../interfaces/auth";
import { LuLock, LuTrendingUp, LuTrendingDown, LuDollarSign, LuHistory, LuArrowLeft, LuEye } from "react-icons/lu";
import { FiUnlock, FiPlusCircle } from "react-icons/fi"; // Íconos alternativos de Feather para evitar errores
import "../App.css";

interface MovimientoCaja {
    idMovimiento: number;
    tipoMovimiento: string;
    concepto: string;
    monto: number;
    fechaMovimiento: string;
    idVenta?: number | null;
}

interface SesionCajaHistorial {
    idSesion: number;
    usuario: string;
    fechaApertura: string;
    montoInicial: number;
    fechaCierre?: string | null;
    montoFinalReal?: number | null;
    estado: string;
}

const Caja: React.FC = () => {
    const usuarioGuardado = localStorage.getItem("usuario");
    const usuario: UsuarioLogueado | null = usuarioGuardado ? JSON.parse(usuarioGuardado) : null;

    // --- ESTADOS: Vistas ---
    const [vista, setVista] = useState<'actual' | 'historial'>('actual');

    // --- ESTADOS: Caja Actual ---
    const [idSesion, setIdSesion] = useState<number | null>(null);
    const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [montoInicial, setMontoInicial] = useState<number | "">("");
    const [montoFinalReal, setMontoFinalReal] = useState<number | "">("");

    const [mostrarModalMov, setMostrarModalMov] = useState(false);
    const [formMovimiento, setFormMovimiento] = useState({
        tipoMovimiento: "INGRESO",
        concepto: "",
        monto: "" as number | ""
    });

    // --- ESTADOS: Historial ---
    const [historialCajas, setHistorialCajas] = useState<SesionCajaHistorial[]>([]);
    const [cargandoHistorial, setCargandoHistorial] = useState(false);
    const [sesionDetalleId, setSesionDetalleId] = useState<number | null>(null);
    const [movimientosDetalle, setMovimientosDetalle] = useState<MovimientoCaja[]>([]);

    // 1. Cargar sesión actual al iniciar
    useEffect(() => {
        const sesionGuardada = localStorage.getItem("caja_sesion_id");
        if (sesionGuardada) {
            const sesionId = parseInt(sesionGuardada);
            setIdSesion(sesionId);
            cargarFlujoCaja(sesionId, false);
        }
    }, []);

    // 2. Cargar historial cuando se cambia de pestaña
    useEffect(() => {
        if (vista === 'historial' && sesionDetalleId === null) {
            cargarHistorial();
        }
    }, [vista, sesionDetalleId]);

    // --- FUNCIONES DE CAJA ACTUAL ---
    const cargarFlujoCaja = async (sesionId: number, esDetalleHistorico: boolean = false) => {
        if (!esDetalleHistorico) setCargando(true);
        setError(null);
        try {
            const res = await api.get(`Caja/Flujo/${sesionId}`);
            if (res.data.success) {
                if (esDetalleHistorico) {
                    setMovimientosDetalle(res.data.data);
                } else {
                    setMovimientos(res.data.data);
                }
            } else {
                setError(res.data.mensaje || "Error al obtener el flujo.");
            }
        } catch (err: any) {
            setError(err.response?.data?.mensaje || "Error de conexión al cargar el flujo.");
            if (!esDetalleHistorico && (err.response?.status === 400 || err.response?.status === 404)) {
                limpiarSesionLocal();
            }
        } finally {
            if (!esDetalleHistorico) setCargando(false);
        }
    };

    const handleAbrirCaja = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!usuario) { setError("No hay usuario autenticado."); return; }
        if (montoInicial === "" || montoInicial < 0) { setError("Ingrese un monto inicial válido."); return; }

        setCargando(true);
        try {
            const res = await api.post("Caja/Abrir", {
                idUsuario: usuario.id,
                montoInicial: Number(montoInicial)
            });

            if (res.data.success) {
                const nuevaSesionId = res.data.idSesion;
                setIdSesion(nuevaSesionId);
                localStorage.setItem("caja_sesion_id", nuevaSesionId.toString());
                setMontoInicial("");
                cargarFlujoCaja(nuevaSesionId, false);
            } else {
                setError(res.data.mensaje);
            }
        } catch (err: any) {
            setError(err.response?.data?.mensaje || "Error al abrir la caja.");
        } finally {
            setCargando(false);
        }
    };

    const handleCerrarCaja = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!idSesion) return;
        if (montoFinalReal === "" || montoFinalReal < 0) { setError("Ingrese el monto real que tiene en caja."); return; }
        if (!window.confirm("¿Está seguro que desea cerrar la caja? Ya no podrá registrar más ventas en esta sesión.")) return;

        setCargando(true);
        try {
            const res = await api.post("Caja/Cerrar", { idSesion: idSesion, montoFinalReal: Number(montoFinalReal) });
            if (res.data.success) {
                alert("Caja cerrada exitosamente.");
                limpiarSesionLocal();
            } else {
                setError(res.data.mensaje);
            }
        } catch (err: any) {
            setError(err.response?.data?.mensaje || "Error al cerrar la caja.");
        } finally {
            setCargando(false);
        }
    };

    const handleGuardarMovimiento = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!idSesion) return;
        if (formMovimiento.monto === "" || formMovimiento.monto <= 0) { setError("El monto debe ser mayor a cero."); return; }
        if (formMovimiento.concepto.trim() === "") { setError("El concepto es obligatorio."); return; }

        setCargando(true);
        try {
            const res = await api.post("Caja/Movimiento", {
                idSesion: idSesion,
                tipoMovimiento: formMovimiento.tipoMovimiento,
                concepto: formMovimiento.concepto,
                monto: Number(formMovimiento.monto)
            });
            if (res.data.success) {
                setMostrarModalMov(false);
                setFormMovimiento({ tipoMovimiento: "INGRESO", concepto: "", monto: "" });
                cargarFlujoCaja(idSesion, false);
            } else {
                setError(res.data.mensaje);
            }
        } catch (err: any) {
            setError(err.response?.data?.mensaje || "Error al registrar el movimiento.");
        } finally {
            setCargando(false);
        }
    };

    const limpiarSesionLocal = () => {
        localStorage.removeItem("caja_sesion_id");
        setIdSesion(null);
        setMovimientos([]);
        setMontoFinalReal("");
    };

    // --- FUNCIONES DE HISTORIAL ---
    const cargarHistorial = async () => {
        setCargandoHistorial(true);
        try {
            const res = await api.get("Caja/Historial");
            if (res.data.success) {
                setHistorialCajas(res.data.data);
            }
        } catch (err: any) {
            console.error("Error al cargar historial", err);
        } finally {
            setCargandoHistorial(false);
        }
    };

    const verDetalleSesionHistorica = async (sesionId: number) => {
        setSesionDetalleId(sesionId);
        await cargarFlujoCaja(sesionId, true);
    };

    // --- CÁLCULOS ---
    const calcularCuadre = (movs: MovimientoCaja[]) => {
        const totalApertura = movs.filter(m => m.tipoMovimiento === 'APERTURA').reduce((acc, m) => acc + m.monto, 0);
        const totalVentas = movs.filter(m => m.tipoMovimiento === 'VENTA').reduce((acc, m) => acc + m.monto, 0);
        const totalIngresos = movs.filter(m => m.tipoMovimiento === 'INGRESO').reduce((acc, m) => acc + m.monto, 0);
        const totalEgresos = movs.filter(m => m.tipoMovimiento === 'EGRESO').reduce((acc, m) => acc + Math.abs(m.monto), 0);
        const totalCalculado = movs.reduce((acc, m) => acc + m.monto, 0);
        return { totalApertura, totalVentas, totalIngresos, totalEgresos, totalCalculado };
    };

    const cuadreActual = calcularCuadre(movimientos);
    const cuadreHistorico = calcularCuadre(movimientosDetalle);

    return (
        <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
            <div className="pos-header" style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <h2 className="pos-title">Caja y Finanzas</h2>

                {/* --- TABS DE NAVEGACIÓN --- */}
                <div style={{ display: 'flex', border: '1px solid #d1d5db', borderRadius: 8, overflow: 'hidden' }}>
                    <button
                        onClick={() => { setVista('actual'); setSesionDetalleId(null); }}
                        style={{
                            padding: '8px 16px', fontSize: 14, border: 'none', cursor: 'pointer',
                            background: vista === 'actual' ? '#0f2a1f' : '#fff',
                            color: vista === 'actual' ? '#fff' : '#374151',
                            display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                    >
                        <FiUnlock size={14} /> Mi Caja
                    </button>
                    <button
                        onClick={() => setVista('historial')}
                        style={{
                            padding: '8px 16px', fontSize: 14, border: 'none', cursor: 'pointer',
                            background: vista === 'historial' ? '#0f2a1f' : '#fff',
                            color: vista === 'historial' ? '#fff' : '#374151',
                            display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                    >
                        <LuHistory size={15} /> Historial
                    </button>
                </div>
            </div>

            {error && (
                <div style={{ background: "#FCEBEB", color: "#791F1F", padding: "10px 15px", borderRadius: "8px", marginBottom: "20px" }}>
                    {error}
                </div>
            )}

            {/* ======================= VISTA: CAJA ACTUAL ======================= */}
            {vista === 'actual' && (
                <>
                    {!idSesion ? (
                        /* PANTALLA: ABRIR CAJA */
                        <div style={{ background: "#fff", padding: "30px", borderRadius: "12px", border: "1px solid #e5e7eb", maxWidth: "400px", margin: "40px auto", textAlign: "center" }}>
                            <FiUnlock size={48} color="#16a34a" style={{ marginBottom: "15px" }} />
                            <h3 style={{ marginBottom: "20px", color: "#374151" }}>Abrir Turno de Caja</h3>
                            <form onSubmit={handleAbrirCaja}>
                                <div className="form-group" style={{ textAlign: "left" }}>
                                    <label className="form-label">Monto Inicial (Fondo base)</label>
                                    <input
                                        type="number" className="form-input" step="0.01" min="0"
                                        value={montoInicial} onChange={(e) => setMontoInicial(e.target.value === "" ? "" : parseFloat(e.target.value))}
                                        placeholder="0.00" required
                                    />
                                </div>
                                <button type="submit" className="pos-btn-pagar" style={{ width: "100%", marginTop: "15px" }} disabled={cargando}>
                                    {cargando ? "Procesando..." : "Abrir Caja"}
                                </button>
                            </form>
                        </div>
                    ) : (
                        /* PANTALLA: CAJA ABIERTA (CUADRE) */
                        <>
                            {/* Tarjetas Resumen */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "15px", marginBottom: "25px" }}>
                                <div style={{ background: "#fff", padding: "20px", borderRadius: "10px", borderLeft: "4px solid #3b82f6" }}>
                                    <div style={{ fontSize: "13px", color: "#6b7280", fontWeight: 600 }}>FONDO INICIAL</div>
                                    <div style={{ fontSize: "24px", fontWeight: 700, color: "#1f2937" }}>${cuadreActual.totalApertura.toFixed(2)}</div>
                                </div>
                                <div style={{ background: "#fff", padding: "20px", borderRadius: "10px", borderLeft: "4px solid #16a34a" }}>
                                    <div style={{ fontSize: "13px", color: "#6b7280", fontWeight: 600 }}>VENTAS + INGRESOS</div>
                                    <div style={{ fontSize: "24px", fontWeight: 700, color: "#1f2937" }}>${(cuadreActual.totalVentas + cuadreActual.totalIngresos).toFixed(2)}</div>
                                </div>
                                <div style={{ background: "#fff", padding: "20px", borderRadius: "10px", borderLeft: "4px solid #ef4444" }}>
                                    <div style={{ fontSize: "13px", color: "#6b7280", fontWeight: 600 }}>EGRESOS (SALIDAS)</div>
                                    <div style={{ fontSize: "24px", fontWeight: 700, color: "#1f2937" }}>${cuadreActual.totalEgresos.toFixed(2)}</div>
                                </div>
                                <div style={{ background: "#0f2a1f", padding: "20px", borderRadius: "10px", color: "#fff" }}>
                                    <div style={{ fontSize: "13px", color: "#9ca3af", fontWeight: 600 }}>TOTAL EN CAJA</div>
                                    <div style={{ fontSize: "28px", fontWeight: 700 }}>${cuadreActual.totalCalculado.toFixed(2)}</div>
                                </div>
                            </div>

                            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                                {/* Panel Izquierdo: Movimientos */}
                                <div style={{ flex: "1 1 60%", background: "#fff", borderRadius: "10px", border: "1px solid #e5e7eb", padding: "20px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                                        <h3 style={{ margin: 0, color: "#374151" }}>Historial de Movimientos</h3>
                                            <button className="btn" style={{ background: "#9ca3af", display: "flex", alignItems: "center", gap: "6px" }} onClick={() => setMostrarModalMov(true)}>
                                            <FiPlusCircle size={16} /> Movimiento Manual
                                        </button>
                                    </div>
                                    {cargando ? <p style={{ textAlign: "center" }}>Cargando...</p> : (
                                        <div className="table-container" style={{ maxHeight: "400px", overflowY: "auto" }}>
                                            <table className="clientes-table">
                                                <thead>
                                                    <tr>
                                                        <th>Hora</th>
                                                        <th>Tipo</th>
                                                        <th>Concepto</th>
                                                        <th style={{ textAlign: "right" }}>Monto</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {movimientos.map((mov) => {
                                                        const esIngreso = mov.monto > 0;
                                                        return (
                                                            <tr key={mov.idMovimiento}>
                                                                <td>{new Date(mov.fechaMovimiento).toLocaleTimeString()}</td>
                                                                <td>
                                                                    <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 6px", borderRadius: "4px", background: mov.tipoMovimiento === 'APERTURA' ? '#e0f2fe' : (mov.tipoMovimiento === 'EGRESO' ? '#fee2e2' : '#dcfce7'), color: mov.tipoMovimiento === 'APERTURA' ? '#0369a1' : (mov.tipoMovimiento === 'EGRESO' ? '#991b1b' : '#166534') }}>
                                                                        {mov.tipoMovimiento}
                                                                    </span>
                                                                </td>
                                                                <td>{mov.concepto}</td>
                                                                <td style={{ textAlign: "right", fontWeight: 600, color: esIngreso ? "#16a34a" : "#ef4444" }}>
                                                                    {esIngreso ? '+' : '-'}${Math.abs(mov.monto).toFixed(2)}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                                {/* Panel Derecho: Cierre */}
                                <div style={{ flex: "1 1 35%", background: "#f9fafb", borderRadius: "10px", border: "1px dashed #d1d5db", padding: "20px" }}>
                                    <div style={{ textAlign: "center", marginBottom: "20px" }}>
                                        <LuLock size={40} color="#374151" />
                                        <h3 style={{ margin: "10px 0 5px" }}>Cierre de Turno</h3>
                                    </div>
                                    <form onSubmit={handleCerrarCaja}>
                                        <div className="form-group">
                                            <label className="form-label" style={{ fontWeight: 600 }}>Dinero Físico Real</label>
                                            <div style={{ position: "relative" }}>
                                                <LuDollarSign style={{ position: "absolute", left: "10px", top: "11px", color: "#9ca3af" }} size={18} />
                                                <input type="number" className="form-input" style={{ paddingLeft: "32px", fontSize: "18px", fontWeight: "bold" }} step="0.01" min="0" value={montoFinalReal} onChange={(e) => setMontoFinalReal(e.target.value === "" ? "" : parseFloat(e.target.value))} required />
                                            </div>
                                        </div>
                                        {montoFinalReal !== "" && (
                                            <div style={{ padding: "10px", borderRadius: "6px", marginBottom: "20px", fontWeight: 600, textAlign: "center", background: Number(montoFinalReal) === cuadreActual.totalCalculado ? "#dcfce7" : (Number(montoFinalReal) < cuadreActual.totalCalculado ? "#fee2e2" : "#fef3c7"), color: Number(montoFinalReal) === cuadreActual.totalCalculado ? "#166534" : (Number(montoFinalReal) < cuadreActual.totalCalculado ? "#991b1b" : "#92400e") }}>
                                                {Number(montoFinalReal) === cuadreActual.totalCalculado && "¡Caja Exacta!"}
                                                {Number(montoFinalReal) < cuadreActual.totalCalculado && `Faltante: $${(cuadreActual.totalCalculado - Number(montoFinalReal)).toFixed(2)}`}
                                                {Number(montoFinalReal) > cuadreActual.totalCalculado && `Sobrante: $${(Number(montoFinalReal) - cuadreActual.totalCalculado).toFixed(2)}`}
                                            </div>
                                        )}
                                        <button type="submit" className="pos-btn-pagar" style={{ width: "100%", background: "#111827" }} disabled={cargando}>Confirmar Cierre</button>
                                    </form>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}

            {/* ======================= VISTA: HISTORIAL ======================= */}
            {vista === 'historial' && (
                <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e5e7eb", padding: "20px" }}>
                    {sesionDetalleId === null ? (
                        /* TABLA DEL HISTORIAL GENERAL */
                        <>
                            <h3 style={{ marginTop: 0, marginBottom: "20px", color: "#374151" }}>Registros Anteriores</h3>
                            {cargandoHistorial ? <p>Cargando historial...</p> : historialCajas.length === 0 ? <p className="pos-empty">No hay cajas registradas.</p> : (
                                <div className="table-container">
                                    <table className="clientes-table">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Usuario</th>
                                                <th>Fecha Apertura</th>
                                                <th>Fecha Cierre</th>
                                                <th>Monto Final</th>
                                                <th>Estado</th>
                                                <th>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {historialCajas.map((c) => (
                                                <tr key={c.idSesion}>
                                                    <td>{c.idSesion}</td>
                                                    <td>{c.usuario}</td>
                                                    <td>{new Date(c.fechaApertura).toLocaleString()}</td>
                                                    <td>{c.fechaCierre ? new Date(c.fechaCierre).toLocaleString() : '-'}</td>
                                                    <td style={{ fontWeight: 600 }}>{c.montoFinalReal != null ? `$${c.montoFinalReal.toFixed(2)}` : '-'}</td>
                                                    <td>
                                                        <span style={{ fontSize: "12px", fontWeight: 600, color: c.estado === 'ABIERTA' ? '#16a34a' : '#6b7280' }}>
                                                            {c.estado}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <button className="btn-action-text" onClick={() => verDetalleSesionHistorica(c.idSesion)} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <LuEye size={14} /> Ver Flujo
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    ) : (
                        /* DETALLE DE UNA SESIÓN HISTÓRICA */
                        <div>
                            <button className="btn" style={{ marginBottom: "20px", background: "#6b7280", display: "flex", alignItems: "center", gap: "6px" }} onClick={() => setSesionDetalleId(null)}>
                                <LuArrowLeft size={16} /> Volver al Historial
                            </button>

                            <h3 style={{ margin: "0 0 20px 0", color: "#111827" }}>Detalle de Caja #{sesionDetalleId}</h3>

                            {/* Tarjetas Resumen del Histórico */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "15px", marginBottom: "25px" }}>
                                <div style={{ background: "#f9fafb", padding: "15px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                                    <div style={{ fontSize: "12px", color: "#6b7280" }}>FONDO INICIAL</div>
                                    <div style={{ fontSize: "20px", fontWeight: 700 }}>${cuadreHistorico.totalApertura.toFixed(2)}</div>
                                </div>
                                <div style={{ background: "#f9fafb", padding: "15px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                                    <div style={{ fontSize: "12px", color: "#6b7280" }}>VENTAS/INGRESOS</div>
                                    <div style={{ fontSize: "20px", fontWeight: 700 }}>${(cuadreHistorico.totalVentas + cuadreHistorico.totalIngresos).toFixed(2)}</div>
                                </div>
                                <div style={{ background: "#f9fafb", padding: "15px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                                    <div style={{ fontSize: "12px", color: "#6b7280" }}>EGRESOS</div>
                                    <div style={{ fontSize: "20px", fontWeight: 700 }}>${cuadreHistorico.totalEgresos.toFixed(2)}</div>
                                </div>
                                <div style={{ background: "#f3f4f6", padding: "15px", borderRadius: "8px", border: "1px solid #d1d5db" }}>
                                    <div style={{ fontSize: "12px", color: "#374151", fontWeight: 600 }}>TOTAL ESPERADO</div>
                                    <div style={{ fontSize: "22px", fontWeight: 700, color: "#111827" }}>${cuadreHistorico.totalCalculado.toFixed(2)}</div>
                                </div>
                            </div>

                            {/* Tabla de movimientos del Histórico */}
                            <div className="table-container">
                                <table className="clientes-table">
                                    <thead>
                                        <tr>
                                            <th>Hora</th>
                                            <th>Tipo</th>
                                            <th>Concepto</th>
                                            <th style={{ textAlign: "right" }}>Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {movimientosDetalle.map((mov) => {
                                            const esIngreso = mov.monto > 0;
                                            return (
                                                <tr key={mov.idMovimiento}>
                                                    <td>{new Date(mov.fechaMovimiento).toLocaleString()}</td>
                                                    <td><span style={{ fontSize: "11px", fontWeight: 600 }}>{mov.tipoMovimiento}</span></td>
                                                    <td>{mov.concepto}</td>
                                                    <td style={{ textAlign: "right", color: esIngreso ? "#16a34a" : "#ef4444" }}>
                                                        {esIngreso ? '+' : '-'}${Math.abs(mov.monto).toFixed(2)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ======================= MODALES COMPARTIDOS ======================= */}
            {mostrarModalMov && (
                <div className="modal-overlay" onClick={() => setMostrarModalMov(false)}>
                    <div className="modal-content" style={{ maxWidth: "400px" }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Registrar Movimiento</h2>
                            <button className="btn-close" onClick={() => setMostrarModalMov(false)}>✕</button>
                        </div>
                        <form onSubmit={handleGuardarMovimiento} style={{ marginTop: "15px" }}>
                            <div className="form-group">
                                <div style={{ display: "flex", gap: "10px" }}>
                                    <button type="button" onClick={() => setFormMovimiento({ ...formMovimiento, tipoMovimiento: 'INGRESO' })} style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "1px solid", background: formMovimiento.tipoMovimiento === 'INGRESO' ? "#dcfce7" : "#fff", borderColor: formMovimiento.tipoMovimiento === 'INGRESO' ? "#16a34a" : "#d1d5db", display: "flex", justifyContent: "center", gap: "6px" }}>
                                        <LuTrendingUp size={16} color={formMovimiento.tipoMovimiento === 'INGRESO' ? "#16a34a" : "#6b7280"} /> Ingreso
                                    </button>
                                    <button type="button" onClick={() => setFormMovimiento({ ...formMovimiento, tipoMovimiento: 'EGRESO' })} style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "1px solid", background: formMovimiento.tipoMovimiento === 'EGRESO' ? "#fee2e2" : "#fff", borderColor: formMovimiento.tipoMovimiento === 'EGRESO' ? "#ef4444" : "#d1d5db", display: "flex", justifyContent: "center", gap: "6px" }}>
                                        <LuTrendingDown size={16} color={formMovimiento.tipoMovimiento === 'EGRESO' ? "#ef4444" : "#6b7280"} /> Salida
                                    </button>
                                </div>
                            </div>
                            <div className="form-group"><label className="form-label">Concepto (Motivo)</label><input type="text" className="form-input" value={formMovimiento.concepto} onChange={(e) => setFormMovimiento({ ...formMovimiento, concepto: e.target.value })} required /></div>
                            <div className="form-group"><label className="form-label">Monto ($)</label><input type="number" className="form-input" step="0.01" min="0.01" value={formMovimiento.monto} onChange={(e) => setFormMovimiento({ ...formMovimiento, monto: e.target.value === "" ? "" : parseFloat(e.target.value) })} required /></div>
                            <div className="modal-footer" style={{ marginTop: "20px" }}>
                                <button type="button" className="btn-cancelar" onClick={() => setMostrarModalMov(false)}>Cancelar</button>
                                <button type="submit" className="btn-guardar" disabled={cargando}>Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Caja;