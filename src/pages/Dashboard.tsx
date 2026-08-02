import React, { useState, useEffect } from 'react';
import {
    LuShoppingCart,
    LuTrendingUp,
    LuPercent,
    LuCalendar
} from "react-icons/lu";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ComposedChart,
    Line
} from 'recharts';
import api from '../services/api';
import '../App.css';

interface VentasDia {
    cantidadVentas: number;
    totalVentas: number;
    ticketPromedio: number;
}

interface MargenDatos {
    totalVentas: number;
    totalCosto: number;
    utilidadBruta: number;
    margenGananciaPct: number;
    margenUtilidadBrutaPct: number;
}

interface ProductoVencimiento {
    idProducto: number;
    nombre: string;
    fechaVencimiento: string;
    diasRestantes: number;
    stockRestante: number;
}

interface ProductoMasVendido {
    idProducto: number;
    nombre: string;
    cantidadVendida: number;
    totalVendido: number;
}

const Dashboard: React.FC = () => {
    const hoy = new Date().toISOString().split('T')[0];
    const fechaActual = new Date();
    const inicioMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1).toISOString().split('T')[0];

    // ── 📊 FILTROS E INDEPENDENCIA DE DATOS ──
    const [fechaVentasFin, setFechaVentasFin] = useState<string>(hoy);
    const [ventasDia, setVentasDia] = useState<VentasDia | null>(null);
    const [cargandoVentas, setCargandoVentas] = useState<boolean>(false);

    const [margenFechas, setMargenFechas] = useState({ inicio: inicioMes, fin: hoy });
    const [margenes, setMargenes] = useState<MargenDatos | null>(null);
    const [cargandoMargenes, setCargandoMargenes] = useState<boolean>(false);

    const [topVencimiento, setTopVencimiento] = useState<number>(5);
    const [productosVencimiento, setProductosVencimiento] = useState<ProductoVencimiento[]>([]);
    const [cargandoVencimiento, setCargandoVencimiento] = useState<boolean>(false);

    const [topVendidosFechas, setTopVendidosFechas] = useState({ inicio: inicioMes, fin: hoy });
    const [topVendidosCantidad, setTopVendidosCantidad] = useState<number>(5);
    const [productosMasVendidos, setProductosMasVendidos] = useState<ProductoMasVendido[]>([]);
    const [cargandoVendidos, setCargandoVendidos] = useState<boolean>(false);

    const [valorInventario, setValorInventario] = useState<number>(0);
    const [cargandoInventario, setCargandoInventario] = useState<boolean>(true);

    // ── 🔄 PETICIONES ──
    useEffect(() => { fetchVentasDia(); }, [fechaVentasFin]);
    useEffect(() => { fetchMargenes(); }, [margenFechas]);
    useEffect(() => { fetchVencimientos(); }, [topVencimiento]);
    useEffect(() => { fetchMasVendidos(); }, [topVendidosFechas, topVendidosCantidad]);
    useEffect(() => { fetchValorInventario(); }, []);

    const fetchVentasDia = async () => {
        setCargandoVentas(true);
        try {
            const res = await api.get('/Dashboard/VentasDia', { params: { fecha: fechaVentasFin } });
            if (res.data?.success) setVentasDia(res.data.data);
        } catch { setVentasDia(null); } finally { setCargandoVentas(false); }
    };

    const fetchMargenes = async () => {
        setCargandoMargenes(true);
        try {
            const res = await api.get('/Dashboard/Margenes', { params: { fechaInicio: margenFechas.inicio, fechaFin: margenFechas.fin } });
            if (res.data?.success) setMargenes(res.data.data);
        } catch { setMargenes(null); } finally { setCargandoMargenes(false); }
    };

    const fetchVencimientos = async () => {
        setCargandoVencimiento(true);
        try {
            const res = await api.get('/Dashboard/ProductosVencimientoProximo', { params: { diasLimite: 30, top: topVencimiento } });
            if (res.data?.success) setProductosVencimiento(res.data.data);
        } catch { setProductosVencimiento([]); } finally { setCargandoVencimiento(false); }
    };

    const fetchMasVendidos = async () => {
        setCargandoVendidos(true);
        try {
            const res = await api.get('/Dashboard/ProductosMasVendidos', {
                params: { fechaInicio: topVendidosFechas.inicio, fechaFin: topVendidosFechas.fin, top: topVendidosCantidad }
            });
            if (res.data?.success) setProductosMasVendidos(res.data.data);
        } catch { setProductosMasVendidos([]); } finally { setCargandoVendidos(false); }
    };

    const fetchValorInventario = async () => {
        setCargandoInventario(true);
        try {
            const res = await api.get('/Dashboard/ValorTotalInventario');
            if (res.data?.success) {
                setValorInventario(res.data.data.valorTotalInventario);
            }
        } catch {
            setValorInventario(0);
        } finally {
            setCargandoInventario(false);
        }
    };

    const formatoMoneda = (v: number) => `$${v.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <div className="dashboard-wrapper" style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>

            {/* Header del Dashboard */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>Panel de Control</h1>
                    <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>Monitoreo operativo y financiero en tiempo real</p>
                </div>
            </div>

            {/* Grid Principal de Tarjetas */}
            <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '24px' }}>

                {/* CARD 1: Ventas del día */}
                <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ background: '#ecfdf5', padding: '8px', borderRadius: '8px' }}><LuShoppingCart size={22} color="#10b981" /></div>
                        <input type="date" value={fechaVentasFin} onChange={(e) => setFechaVentasFin(e.target.value)} style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', fontWeight: 500, color: '#334155' }} />
                    </div>
                    <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>Ventas Totales</span>
                    <h2 style={{ fontSize: '28px', margin: '6px 0', color: '#0f172a', fontWeight: 700 }}>{cargandoVentas ? '...' : formatoMoneda(ventasDia?.totalVentas || 0)}</h2>
                    <p style={{ margin: 0, fontSize: '13px', color: '#10b981', fontWeight: 500 }}>{ventasDia?.cantidadVentas || 0} transacciones registradas</p>
                </div>

                {/* CARD 2: Margen de Ganancia */}
                <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ background: '#f0fdf4', padding: '8px', borderRadius: '8px' }}><LuTrendingUp size={22} color="#15803d" /></div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <input type="date" value={margenFechas.inicio} onChange={(e) => setMargenFechas({ ...margenFechas, inicio: e.target.value })} style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '2px 4px', fontSize: '11px' }} />
                            <input type="date" value={margenFechas.fin} onChange={(e) => setMargenFechas({ ...margenFechas, fin: e.target.value })} style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '2px 4px', fontSize: '11px' }} />
                        </div>
                    </div>
                    <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>Margen de Ganancia</span>
                    <h2 style={{ fontSize: '28px', margin: '6px 0', color: '#0f172a', fontWeight: 700 }}>{cargandoMargenes ? '...' : `${(margenes?.margenGananciaPct || 0).toFixed(1)}%`}</h2>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Utilidad: <strong style={{ color: '#0f172a' }}>{formatoMoneda(margenes?.utilidadBruta || 0)}</strong></p>
                </div>

                {/* CARD 3: Valor del Inventario */}
                <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ background: '#eff6ff', padding: '8px', borderRadius: '8px' }}><LuPercent size={22} color="#3b82f6" /></div>
                        <span style={{ fontSize: '12px', color: '#64748b', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px' }}>En línea</span>
                    </div>
                    <div>
                        <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>Valor del Inventario</span>
                        <h2 style={{ fontSize: '28px', margin: '6px 0', color: '#0f172a', fontWeight: 700 }}>
                            {cargandoInventario ? '...' : formatoMoneda(valorInventario)}
                        </h2>
                        <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                            Valor total de inversion en inventario disponible
                        </p>
                    </div>
                </div>

            </div>

            {/* Fila de Reportes Gráficos y Tablas Críticas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px', marginBottom: '24px' }}>

                {/* GRÁFICO 1: Volumen Físico de Productos más Vendidos */}
                <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>Volumen de Salida Comercial</h3>
                            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Unidades vendidas del catálogo líder</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input type="number" min="3" max="15" value={topVendidosCantidad} onChange={(e) => setTopVendidosCantidad(parseInt(e.target.value) || 5)} style={{ width: '45px', padding: '4px', textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
                        </div>
                    </div>

                    <div style={{ width: '100%', height: 220 }}>
                        {cargandoVendidos ? <div style={{ textAlign: 'center', paddingTop: '80px', color: '#64748b' }}>Cargando datos...</div> : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={productosMasVendidos} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="nombre" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ background: '#0f172a', borderRadius: '8px', color: '#fff', border: 'none' }} />
                                    <Bar dataKey="cantidadVendida" name="Unidades Vendidas" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* TABLA: Próximos Vencimientos */}
                <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>Alertas de Merma (Vencimientos)</h3>
                            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Productos en riesgo en los próximos 30 días</p>
                        </div>
                        <input type="number" min="1" value={topVencimiento} onChange={(e) => setTopVencimiento(parseInt(e.target.value) || 5)} style={{ width: '45px', padding: '4px', textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <th style={{ padding: '10px 0', color: '#64748b', fontWeight: 500 }}>Insumo / Producto</th>
                                    <th style={{ padding: '10px 0', color: '#64748b', fontWeight: 500 }}>Stock</th>
                                    <th style={{ padding: '10px 0', color: '#64748b', fontWeight: 500, textAlign: 'right' }}>Días Restantes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cargandoVencimiento ? <tr><td colSpan={3} style={{ textAlign: 'center', padding: '20px' }}>Analizando lotes...</td></tr> :
                                    productosVencimiento.length === 0 ? <tr><td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>Todo en regla, sin alertas próximas.</td></tr> :
                                        productosVencimiento.map(p => (
                                            <tr key={p.idProducto} style={{ borderBottom: '1px solid #f8fafc' }}>
                                                <td style={{ padding: '12px 0', fontWeight: 500, color: '#1e293b' }}>{p.nombre}</td>
                                                <td style={{ padding: '12px 0', color: '#64748b' }}>{p.stockRestante} uds</td>
                                                <td style={{ padding: '12px 0', textAlign: 'right' }}>
                                                    <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: p.diasRestantes <= 10 ? '#fef2f2' : '#fff7ed', color: p.diasRestantes <= 10 ? '#ef4444' : '#f97316' }}>
                                                        {p.diasRestantes} días
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* ── 📊 GRÁFICO MIXTO RESPONSIVO ── */}
            <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Balance de Rendimiento Financiero vs Desplazamiento</h3>
                        <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Conjugación de Ingresos Líquidos ($) frente a Unidades Físicas Entregadas</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', padding: '4px 8px', borderRadius: '8px' }}>
                        <LuCalendar size={14} color="#64748b" />
                        <input type="date" value={topVendidosFechas.inicio} onChange={(e) => setTopVendidosFechas({ ...topVendidosFechas, inicio: e.target.value })} style={{ border: 'none', background: 'transparent', fontSize: '12px', fontWeight: 500 }} />
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>a</span>
                        <input type="date" value={topVendidosFechas.fin} onChange={(e) => setTopVendidosFechas({ ...topVendidosFechas, fin: e.target.value })} style={{ border: 'none', background: 'transparent', fontSize: '12px', fontWeight: 500 }} />
                    </div>
                </div>

                <div style={{ width: '100%', height: 300 }}>
                    {cargandoVendidos ? (
                        <div style={{ textAlign: 'center', paddingTop: '120px', color: '#64748b' }}>Conjugando métricas...</div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={productosMasVendidos} margin={{ top: 10, right: -10, left: -10, bottom: 0 }}>
                                <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="nombre" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />

                                {/* Eje Izquierdo para Dinero */}
                                <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />

                                {/* Eje Derecho para Unidades */}
                                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v} u`} />

                                <Tooltip contentStyle={{ background: '#0f172a', borderRadius: '8px', color: '#fff', border: 'none', fontSize: '13px' }} />
                                <Legend verticalAlign="top" height={36} iconType="circle" />

                                {/* Serie 1: Barras Azules elegantes para Monto Monetario */}
                                <Bar yAxisId="left" dataKey="totalVendido" name="Ingreso Total ($)" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={32} />

                                {/* Serie 2: Línea Naranja Dinámica con Nodos para Volumen */}
                                <Line yAxisId="right" type="monotone" dataKey="cantidadVendida" name="Unidades Desplazadas (Uds)" stroke="#f97316" strokeWidth={3} dot={{ r: 5, strokeWidth: 2, fill: '#ffffff' }} activeDot={{ r: 7 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

        </div>
    );
};

export default Dashboard;