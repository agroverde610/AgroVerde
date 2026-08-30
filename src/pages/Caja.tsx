import React, { useState, useEffect } from "react";
import api from "../services/api";
import type { UsuarioLogueado } from "../interfaces/auth";
import { LuLock, LuTrendingUp, LuTrendingDown, LuDollarSign, LuHistory, LuArrowLeft, LuEye, LuLandmark } from "react-icons/lu";
import { FiUnlock, FiPlusCircle } from "react-icons/fi";
import "../App.css";

interface MovimientoCaja {
    idMovimiento: number;
    tipoMovimiento: string;
    concepto: string;
    formaPago: string;
    monto: number;
    fechaMovimiento: string;
    idVenta?: number | null;
}

interface SesionCajaHistorial {
    idSesion: number;
    idUsuario: number;
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

    const [vista, setVista] = useState<'actual' | 'historial'>('actual');

    const [idSesion, setIdSesion] = useState<number | null>(null);
    const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [montoInicial, setMontoInicial] = useState<number | "">("");
    const [montoFinalReal, setMontoFinalReal] = useState<number | "">("");

    const [mostrarModalMov, setMostrarModalMov] = useState(false);
    const [formMovimiento, setFormMovimiento] = useState({
        tipoMovimiento: "INGRESO",
        formaPago: "EFECTIVO",
        concepto: "",
        monto: "" as number | ""
    });

    const [historialCajas, setHistorialCajas] = useState<SesionCajaHistorial[]>([]);
    const [cargandoHistorial, setCargandoHistorial] = useState(false);
    const [sesionDetalleId, setSesionDetalleId] = useState<number | null>(null);
    const [movimientosDetalle, setMovimientosDetalle] = useState<MovimientoCaja[]>([]);

    useEffect(() => {
        const sincronizarCajaConBackend = async () => {
            setCargando(true);
            try {
                // 1. Siempre consultamos al backend primero
                const res = await api.get("Caja/Historial");

                if (res.data.success) {
                    const cajas: SesionCajaHistorial[] = res.data.data;
                    // Buscamos SOLO la caja abierta del usuario actual — una caja abierta
                    // por otro cajero no cuenta como "mi caja está abierta".
                    const cajaAbierta = cajas.find(c => c.estado === 'ABIERTA' && c.idUsuario === usuario?.id);

                    if (cajaAbierta) {
                        // 2a. El backend confirma que hay caja abierta: Sincronizamos el frontend
                        setIdSesion(cajaAbierta.idSesion);
                        localStorage.setItem("caja_sesion_id", cajaAbierta.idSesion.toString());

                        // Obligamos a React a esperar los datos
                        await cargarFlujoCaja(cajaAbierta.idSesion, false);
                    } else {
                        // 2b. El backend dice que NO hay caja abierta: Limpiamos cualquier basura del navegador
                        limpiarSesionLocal();
                    }
                }
            } catch (error) {
                console.error("Error de conexión al verificar el estado de la caja:", error);

                const sesionGuardada = localStorage.getItem("caja_sesion_id");
                if (sesionGuardada) {
                    const sesionId = parseInt(sesionGuardada);
                    setIdSesion(sesionId);
                    cargarFlujoCaja(sesionId, false);
                }
            } finally {
                setCargando(false);
            }
        };

        sincronizarCajaConBackend();
    }, []);

    useEffect(() => {
        if (vista === 'historial' && sesionDetalleId === null) {
            cargarHistorial();
        }
    }, [vista, sesionDetalleId]);

    const cargarFlujoCaja = async (sesionId: number, esDetalleHistorico: boolean = false) => {
        if (!esDetalleHistorico) setCargando(true);
        setError(null);
        try {
            const res = await api.get(`Caja/Flujo/${sesionId}`);
            if (res.data.success) {
                if (esDetalleHistorico) setMovimientosDetalle(res.data.data);
                else setMovimientos(res.data.data);
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
            const res = await api.post("Caja/Abrir", { idUsuario: usuario.id, montoInicial: Number(montoInicial) });
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
        if (montoFinalReal === "" || montoFinalReal < 0) { setError("Ingrese el monto físico."); return; }
        if (!window.confirm("¿Está seguro que desea cerrar la caja?")) return;

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
        if (formMovimiento.monto === "" || formMovimiento.monto <= 0) { setError("Monto inválido."); return; }
        if (formMovimiento.concepto.trim() === "") { setError("Concepto obligatorio."); return; }

        setCargando(true);
        try {
            const res = await api.post("Caja/Movimiento", {
                idSesion: idSesion,
                tipoMovimiento: formMovimiento.tipoMovimiento,
                formaPago: formMovimiento.formaPago,
                concepto: formMovimiento.concepto,
                monto: Number(formMovimiento.monto)
            });
            if (res.data.success) {
                setMostrarModalMov(false);
                setFormMovimiento({ tipoMovimiento: "INGRESO", formaPago: "EFECTIVO", concepto: "", monto: "" });
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

    const cargarHistorial = async () => {
        setCargandoHistorial(true);
        try {
            const res = await api.get("Caja/Historial");
            if (res.data.success) setHistorialCajas(res.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setCargandoHistorial(false);
        }
    };

    const verDetalleSesionHistorica = async (sesionId: number) => {
        setSesionDetalleId(sesionId);
        await cargarFlujoCaja(sesionId, true);
    };

    // --- CÁLCULOS SEPARADOS POR MÉTODO DE PAGO ---
    const calcularCuadre = (movs: MovimientoCaja[]) => {
        // Función auxiliar para detectar si un movimiento fue por transferencia
        const esTransferencia = (m: MovimientoCaja) =>
            m.formaPago?.toUpperCase() === 'TRANSFERENCIA' ||
            m.concepto.toUpperCase().includes('TRANSFERENCIA');

        // Efectivo Físico
        const totalApertura = movs.filter(m => m.tipoMovimiento === 'APERTURA').reduce((acc, m) => acc + m.monto, 0);
        const ventasEfectivo = movs.filter(m => m.tipoMovimiento === 'VENTA' && !esTransferencia(m)).reduce((acc, m) => acc + m.monto, 0);
        const ingresosEfectivo = movs.filter(m => m.tipoMovimiento === 'INGRESO' && !esTransferencia(m)).reduce((acc, m) => acc + m.monto, 0);
        const egresosEfectivo = movs.filter(m => m.tipoMovimiento === 'EGRESO' && !esTransferencia(m)).reduce((acc, m) => acc + Math.abs(m.monto), 0);

        // Movimientos Banco / Transferencias
        const ventasTransferencia = movs.filter(m => m.tipoMovimiento === 'VENTA' && esTransferencia(m)).reduce((acc, m) => acc + m.monto, 0);
        const ingresosTransferencia = movs.filter(m => m.tipoMovimiento === 'INGRESO' && esTransferencia(m)).reduce((acc, m) => acc + m.monto, 0);
        const egresosTransferencia = movs.filter(m => m.tipoMovimiento === 'EGRESO' && esTransferencia(m)).reduce((acc, m) => acc + Math.abs(m.monto), 0);

        const totalTransferencias = ventasTransferencia + ingresosTransferencia - egresosTransferencia;

        // Total que DEBE haber en la gaveta física (Efectivo)
        const totalFisicoCalculado = totalApertura + ventasEfectivo + ingresosEfectivo - egresosEfectivo;

        return {
            totalApertura,
            ventasEfectivo,
            ingresosManuales: ingresosEfectivo,
            egresosEfectivo,
            totalTransferencias,
            totalFisicoCalculado
        };
    };

    const cuadreActual = calcularCuadre(movimientos);
    const cuadreHistorico = calcularCuadre(movimientosDetalle);

    return (
        <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
            <div className="pos-header" style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <h2 className="pos-title">Caja y Finanzas</h2>
                <div style={{ display: 'flex', border: '1px solid #d1d5db', borderRadius: 8, overflow: 'hidden' }}>
                    <button onClick={() => { setVista('actual'); setSesionDetalleId(null); }} style={{ padding: '8px 16px', fontSize: 14, border: 'none', cursor: 'pointer', background: vista === 'actual' ? '#0f2a1f' : '#fff', color: vista === 'actual' ? '#fff' : '#374151', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FiUnlock size={14} /> Mi Caja
                    </button>
                    <button onClick={() => setVista('historial')} style={{ padding: '8px 16px', fontSize: 14, border: 'none', cursor: 'pointer', background: vista === 'historial' ? '#0f2a1f' : '#fff', color: vista === 'historial' ? '#fff' : '#374151', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <LuHistory size={15} /> Historial
                    </button>
                </div>
            </div>

            {error && <div style={{ background: "#FCEBEB", color: "#791F1F", padding: "10px 15px", borderRadius: "8px", marginBottom: "20px" }}>{error}</div>}

            {vista === 'actual' && (
                <>
                    {!idSesion ? (
                        <div style={{ background: "#fff", padding: "30px", borderRadius: "12px", border: "1px solid #e5e7eb", maxWidth: "400px", margin: "40px auto", textAlign: "center" }}>
                            <FiUnlock size={48} color="#16a34a" style={{ marginBottom: "15px" }} />
                            <h3 style={{ marginBottom: "20px", color: "#374151" }}>Abrir Turno de Caja</h3>
                            <form onSubmit={handleAbrirCaja}>
                                <div className="form-group" style={{ textAlign: "left" }}>
                                    <label className="form-label">Monto Inicial (Efectivo base)</label>
                                    <input type="number" className="form-input" step="0.01" min="0" value={montoInicial} onChange={(e) => setMontoInicial(e.target.value === "" ? "" : parseFloat(e.target.value))} placeholder="0.00" required />
                                </div>
                                <button type="submit" className="pos-btn-pagar" style={{ width: "100%", marginTop: "15px" }} disabled={cargando}>{cargando ? "Procesando..." : "Abrir Caja"}</button>
                            </form>
                        </div>
                    ) : (
                        <>
                            {/* Tarjetas Resumen - SEPARANDO EFECTIVO Y BANCO */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "15px", marginBottom: "25px" }}>
                                <div style={{ background: "#fff", padding: "15px 20px", borderRadius: "10px", borderLeft: "4px solid #6b7280" }}>
                                    <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: 600 }}>FONDO INICIAL</div>
                                    <div style={{ fontSize: "22px", fontWeight: 700, color: "#1f2937" }}>${cuadreActual.totalApertura.toFixed(2)}</div>
                                </div>
                                <div style={{ background: "#fff", padding: "15px 20px", borderRadius: "10px", borderLeft: "4px solid #16a34a" }}>
                                    <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: 600 }}>EFECTIVO (Ventas+Ingresos)</div>
                                    <div style={{ fontSize: "22px", fontWeight: 700, color: "#1f2937" }}>${(cuadreActual.ventasEfectivo + cuadreActual.ingresosManuales).toFixed(2)}</div>
                                </div>
                                <div style={{ background: "#f0fdf4", padding: "15px 20px", borderRadius: "10px", borderLeft: "4px solid #3b82f6" }}>
                                    <div style={{ fontSize: "12px", color: "#1e3a8a", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}><LuLandmark size={14} /> TRANSFERENCIAS (Banco)</div>
                                    <div style={{ fontSize: "22px", fontWeight: 700, color: "#1e3a8a" }}>${cuadreActual.totalTransferencias.toFixed(2)}</div>
                                </div>
                                <div style={{ background: "#0f2a1f", padding: "15px 20px", borderRadius: "10px", color: "#fff", borderLeft: "4px solid #10b981" }}>
                                    <div style={{ fontSize: "12px", color: "#9ca3af", fontWeight: 600 }}>CAJA FÍSICA (Lo que debe contar)</div>
                                    <div style={{ fontSize: "22px", fontWeight: 700 }}>${cuadreActual.totalFisicoCalculado.toFixed(2)}</div>
                                </div>
                            </div>

                            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                                {/* Panel Izquierdo: Movimientos */}
                                <div style={{ flex: "1 1 60%", background: "#fff", borderRadius: "10px", border: "1px solid #e5e7eb", padding: "20px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                                        <h3 style={{ margin: 0, color: "#374151" }}>Flujo del Turno</h3>
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
                                                        <th>Tipo Movimiento</th>
                                                        <th style={{ textAlign: "right" }}>Monto</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {movimientos.map((mov) => {
                                                        const esIngreso = mov.monto > 0;
                                                        const esTransferencia = mov.formaPago?.toUpperCase() === 'TRANSFERENCIA' || mov.concepto.toUpperCase().includes('TRANSFERENCIA');

                                                        return (
                                                            <tr key={mov.idMovimiento}>
                                                                <td style={{ fontSize: "12px", color: "#6b7280" }}>{new Date(mov.fechaMovimiento).toLocaleTimeString()}</td>
                                                                <td>
                                                                    <span style={{ fontSize: "10px", fontWeight: 600, padding: "3px 6px", borderRadius: "4px", background: mov.tipoMovimiento === 'APERTURA' ? '#e0f2fe' : (mov.tipoMovimiento === 'EGRESO' ? '#fee2e2' : '#dcfce7'), color: mov.tipoMovimiento === 'APERTURA' ? '#0369a1' : (mov.tipoMovimiento === 'EGRESO' ? '#991b1b' : '#166534') }}>
                                                                        {mov.tipoMovimiento}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    <span>
                                                                        {mov.concepto}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    {mov.concepto.toLowerCase().includes("anulación") || mov.concepto.toLowerCase().includes("anulacion") ? (
                                                                        <span style={{ marginLeft: "8px", fontSize: "10px", background: "#fee2e2", color: "#991b1b", padding: "2px 6px", borderRadius: "10px" }}>
                                                                            ANULACIÓN
                                                                        </span>
                                                                    ) : esTransferencia ? (
                                                                        <span style={{ marginLeft: "8px", fontSize: "10px", background: "#dbeafe", color: "#1e40af", padding: "2px 6px", borderRadius: "10px" }}>
                                                                            {mov.formaPago}
                                                                        </span>
                                                                    ) : mov.formaPago ? (
                                                                        <span style={{ marginLeft: "8px", fontSize: "10px", background: "#f3f4f6", color: "#374151", padding: "2px 6px", borderRadius: "10px" }}>
                                                                            {mov.formaPago}
                                                                        </span>
                                                                    ) : (
                                                                        "—"
                                                                    )}
                                                                </td>
                                                                <td style={{ textAlign: "right", fontWeight: 600, color: esIngreso ? (esTransferencia ? "#2563eb" : "#16a34a") : "#ef4444" }}>
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
                                        <p style={{ fontSize: "12px", color: "#6b7280" }}>Cuente los <b>billetes y monedas</b> de su gaveta física.</p>
                                    </div>
                                    <form onSubmit={handleCerrarCaja}>
                                        <div className="form-group">
                                            <label className="form-label" style={{ fontWeight: 600 }}>Efectivo Total Real</label>
                                            <div style={{ position: "relative" }}>
                                                <LuDollarSign style={{ position: "absolute", left: "10px", top: "11px", color: "#9ca3af" }} size={18} />
                                                <input type="number" className="form-input" style={{ paddingLeft: "32px", fontSize: "18px", fontWeight: "bold" }} step="0.01" min="0" value={montoFinalReal} onChange={(e) => setMontoFinalReal(e.target.value === "" ? "" : parseFloat(e.target.value))} required />
                                            </div>
                                        </div>
                                        {montoFinalReal !== "" && (
                                            <div style={{ padding: "10px", borderRadius: "6px", marginBottom: "20px", fontWeight: 600, textAlign: "center", background: Number(montoFinalReal) === cuadreActual.totalFisicoCalculado ? "#dcfce7" : (Number(montoFinalReal) < cuadreActual.totalFisicoCalculado ? "#fee2e2" : "#fef3c7"), color: Number(montoFinalReal) === cuadreActual.totalFisicoCalculado ? "#166534" : (Number(montoFinalReal) < cuadreActual.totalFisicoCalculado ? "#991b1b" : "#92400e") }}>
                                                {Number(montoFinalReal) === cuadreActual.totalFisicoCalculado && "¡Caja Físicamente Exacta!"}
                                                {Number(montoFinalReal) < cuadreActual.totalFisicoCalculado && `Faltante de Efectivo: $${(cuadreActual.totalFisicoCalculado - Number(montoFinalReal)).toFixed(2)}`}
                                                {Number(montoFinalReal) > cuadreActual.totalFisicoCalculado && `Sobrante de Efectivo: $${(Number(montoFinalReal) - cuadreActual.totalFisicoCalculado).toFixed(2)}`}
                                            </div>
                                        )}
                                        <button type="submit" className="pos-btn-pagar" style={{ width: "100%", background: "#111827" }} disabled={cargando}>Confirmar Cierre de Efectivo</button>
                                    </form>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}

            {/* VISTA HISTORIAL */}
            {vista === 'historial' && (
                <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e5e7eb", padding: "20px" }}>
                    {sesionDetalleId === null ? (
                        <>
                            <h3 style={{ marginTop: 0, marginBottom: "20px" }}>Registros Anteriores</h3>
                            {cargandoHistorial ? <p>Cargando...</p> : historialCajas.length === 0 ? <p className="pos-empty">No hay cajas registradas.</p> : (
                                <div className="table-container">
                                    <table className="clientes-table">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Usuario</th>
                                                <th>Fecha Apertura</th>
                                                <th>Fecha Cierre</th>
                                                <th>Monto Final (Físico)</th>
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
                                                        <span style={{ fontSize: "12px", fontWeight: 600, color: c.estado === 'ABIERTA' ? '#16a34a' : '#6b7280' }}>{c.estado}</span>
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
                        <div>
                            <button className="btn" style={{ marginBottom: "20px", background: "#6b7280", display: "flex", alignItems: "center", gap: "6px" }} onClick={() => setSesionDetalleId(null)}>
                                <LuArrowLeft size={16} /> Volver al Historial
                            </button>
                            <h3 style={{ margin: "0 0 20px 0" }}>Detalle de Caja #{sesionDetalleId}</h3>

                            {/* Resumen Histórico */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "15px", marginBottom: "25px" }}>
                                <div style={{ background: "#f9fafb", padding: "15px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                                    <div style={{ fontSize: "12px", color: "#6b7280" }}>FONDO INICIAL</div>
                                    <div style={{ fontSize: "20px", fontWeight: 700 }}>${cuadreHistorico.totalApertura.toFixed(2)}</div>
                                </div>
                                <div style={{ background: "#f9fafb", padding: "15px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                                    <div style={{ fontSize: "12px", color: "#6b7280" }}>EFECTIVO (Ventas+Ing.)</div>
                                    <div style={{ fontSize: "20px", fontWeight: 700 }}>${(cuadreHistorico.ventasEfectivo + cuadreHistorico.ingresosManuales).toFixed(2)}</div>
                                </div>
                                <div style={{ background: "#eff6ff", padding: "15px", borderRadius: "8px", border: "1px solid #bfdbfe" }}>
                                    <div style={{ fontSize: "12px", color: "#1e40af" }}>TRANSFERENCIAS</div>
                                    <div style={{ fontSize: "20px", fontWeight: 700, color: "#1e40af" }}>${cuadreHistorico.totalTransferencias.toFixed(2)}</div>
                                </div>
                                <div style={{ background: "#f3f4f6", padding: "15px", borderRadius: "8px", border: "1px solid #d1d5db" }}>
                                    <div style={{ fontSize: "12px", color: "#374151", fontWeight: 600 }}>FÍSICO ESPERADO</div>
                                    <div style={{ fontSize: "22px", fontWeight: 700, color: "#111827" }}>${cuadreHistorico.totalFisicoCalculado.toFixed(2)}</div>
                                </div>
                            </div>

                            <div className="table-container">
                                <table className="clientes-table">
                                    <thead>
                                        <tr>
                                            <th>Hora</th>
                                            <th>Tipo</th>
                                            <th>Concepto</th>
                                            <th>Tipo Movimiento</th>
                                            <th style={{ textAlign: "right" }}>Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {movimientosDetalle.map((mov) => {
                                            const esIngreso = mov.monto > 0;
                                            const esTransferencia = mov.formaPago?.toUpperCase() === 'TRANSFERENCIA' || mov.concepto.toUpperCase().includes('TRANSFERENCIA');

                                            return (
                                                <tr key={mov.idMovimiento}>
                                                    <td style={{ fontSize: "12px", color: "#6b7280" }}>{new Date(mov.fechaMovimiento).toLocaleString()}</td>
                                                    <td><span style={{ fontSize: "10px", fontWeight: 600 }}>{mov.tipoMovimiento}</span></td>
                                                    <td>
                                                        <span>{mov.concepto}</span>
                                                    </td>
                                                    <td>
                                                        {mov.concepto.toLowerCase().includes("anulación") || mov.concepto.toLowerCase().includes("anulacion") ? (
                                                            <span style={{ marginLeft: "8px", fontSize: "10px", background: "#fee2e2", color: "#991b1b", padding: "2px 6px", borderRadius: "10px" }}>
                                                                ANULACIÓN
                                                            </span>
                                                        ) : esTransferencia ? (
                                                            <span style={{ marginLeft: "8px", fontSize: "10px", background: "#dbeafe", color: "#1e40af", padding: "2px 6px", borderRadius: "10px" }}>
                                                                {mov.formaPago}
                                                            </span>
                                                        ) : mov.formaPago ? (
                                                            <span style={{ marginLeft: "8px", fontSize: "10px", background: "#f3f4f6", color: "#374151", padding: "2px 6px", borderRadius: "10px" }}>
                                                                {mov.formaPago}
                                                            </span>
                                                        ) : (
                                                            "—"
                                                        )}
                                                    </td>
                                                    <td style={{ textAlign: "right", color: esIngreso ? (esTransferencia ? "#2563eb" : "#16a34a") : "#ef4444" }}>
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

                            {/* SELECTOR DE FORMA DE PAGO AÑADIDO AQUÍ */}
                            <div className="form-group" style={{ marginTop: "15px" }}>
                                <label className="form-label">Forma de Pago</label>
                                <div style={{ display: "flex", gap: "10px" }}>
                                    <button type="button" onClick={() => setFormMovimiento({ ...formMovimiento, formaPago: 'EFECTIVO' })} style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "1px solid", background: formMovimiento.formaPago === 'EFECTIVO' ? "#f3f4f6" : "#fff", borderColor: formMovimiento.formaPago === 'EFECTIVO' ? "#6b7280" : "#d1d5db", color: "#374151", fontWeight: formMovimiento.formaPago === 'EFECTIVO' ? 600 : 400 }}>
                                        💵 Efectivo
                                    </button>
                                    <button type="button" onClick={() => setFormMovimiento({ ...formMovimiento, formaPago: 'TRANSFERENCIA' })} style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "1px solid", background: formMovimiento.formaPago === 'TRANSFERENCIA' ? "#dbeafe" : "#fff", borderColor: formMovimiento.formaPago === 'TRANSFERENCIA' ? "#3b82f6" : "#d1d5db", color: formMovimiento.formaPago === 'TRANSFERENCIA' ? "#1e40af" : "#374151", fontWeight: formMovimiento.formaPago === 'TRANSFERENCIA' ? 600 : 400 }}>
                                        🏦 Transferencia
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Concepto</label>
                                <input type="text" className="form-input" value={formMovimiento.concepto} onChange={(e) => setFormMovimiento({ ...formMovimiento, concepto: e.target.value })} required />
                            </div>

                            {/* ETIQUETA ACTUALIZADA */}
                            <div className="form-group">
                                <label className="form-label">Monto ($)</label>
                                <input type="number" className="form-input" step="0.01" min="0.01" value={formMovimiento.monto} onChange={(e) => setFormMovimiento({ ...formMovimiento, monto: e.target.value === "" ? "" : parseFloat(e.target.value) })} required />
                            </div>
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