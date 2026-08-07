import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    LuArrowLeft, LuTrendingDown, LuDollarSign, LuPackageX, LuCalendarDays,
    LuThermometerSnowflake, LuCalendarX, LuShieldAlert, LuCircleHelp
} from 'react-icons/lu';
import { BiDetail } from 'react-icons/bi';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import api from '../services/api';
import '../App.css';

// Un color e ícono fijo por motivo, para que se reconozcan de un vistazo
// tanto en el gráfico de pastel como en el resto del reporte.
const CONFIG_MOTIVO: Record<string, { color: string; icono: React.ElementType }> = {
    'Dañado': { color: '#dc6b4f', icono: LuThermometerSnowflake },
    'Vencido': { color: '#c9a227', icono: LuCalendarX },
    'Robo/pérdida': { color: '#8b3a3a', icono: LuShieldAlert },
    'Error de conteo': { color: '#5b7a8c', icono: BiDetail },
    'Otro': { color: '#9ca3af', icono: LuCircleHelp },
    'Sin especificar': { color: '#c7c9cc', icono: LuCircleHelp },
};

const obtenerConfigMotivo = (motivo: string) => CONFIG_MOTIVO[motivo] ?? CONFIG_MOTIVO['Otro'];

const ReporteMermas: React.FC = () => {
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');
    const [resumen, setResumen] = useState<any>({ totalAjustes: 0, totalUnidadesMerma: 0, valorEstimadoPerdido: 0 });
    const [porProducto, setPorProducto] = useState<any[]>([]);
    const [porMotivo, setPorMotivo] = useState<any[]>([]);
    const [mensual, setMensual] = useState<any[]>([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        cargarTodo();
    }, [fechaDesde, fechaHasta]);

    const cargarTodo = async () => {
        setCargando(true);
        const params: any = {};
        if (fechaDesde) params.fechaDesde = fechaDesde;
        if (fechaHasta) params.fechaHasta = fechaHasta;

        try {
            const [resResumen, resProducto, resMotivo, resMensual] = await Promise.all([
                api.get('InventarioFisico/Reporte/Resumen', { params }),
                api.get('InventarioFisico/Reporte/PorProducto', { params }),
                api.get('InventarioFisico/Reporte/PorMotivo', { params }),
                api.get('InventarioFisico/Reporte/Mensual', { params })
            ]);
            if (resResumen.data.success) setResumen(resResumen.data.data);
            if (resProducto.data.success) setPorProducto(resProducto.data.data);
            if (resMotivo.data.success) setPorMotivo(resMotivo.data.data);
            if (resMensual.data.success) setMensual(resMensual.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setCargando(false);
        }
    };

    const motivoPrincipal = porMotivo.length > 0
        ? porMotivo.reduce((max, m) => m.unidadesMerma > max.unidadesMerma ? m : max, porMotivo[0])
        : null;

    return (
        <div className="clientes-wrapper">
            <div className="clientes-header">
                <h1 className="clientes-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Link to="/inventario/fisico" style={{ color: '#9ca3af', display: 'flex' }} title="Volver a Inventario Físico">
                        <LuArrowLeft size={20} />
                    </Link>
                    Reporte de Mermas
                </h1>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <LuCalendarDays size={16} color="#9ca3af" />
                    <input type="date" className="form-input" style={{ padding: '7px 10px', fontSize: 13 }} value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
                    <span style={{ color: '#9ca3af', fontSize: 13 }}>a</span>
                    <input type="date" className="form-input" style={{ padding: '7px 10px', fontSize: 13 }} value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
                    {(fechaDesde || fechaHasta) && (
                        <button className="btn-action-text" onClick={() => { setFechaDesde(''); setFechaHasta(''); }}>
                            Limpiar
                        </button>
                    )}
                </div>
            </div>

            {/* Tarjetas KPI con acento lateral e ícono, en vez de bloques planos de color */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '28px' }}>

                <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', borderLeft: '4px solid #115e59', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>Ajustes registrados</p>
                        <p style={{ fontSize: 28, fontWeight: 700, margin: 0, color: '#173023' }}>{resumen.totalAjustes}</p>
                    </div>
                    <BiDetail size={22} color="#115e59" style={{ opacity: 0.5 }} />
                </div>

                <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', borderLeft: '4px solid #dc6b4f', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>Unidades perdidas</p>
                        <p style={{ fontSize: 28, fontWeight: 700, margin: 0, color: '#173023' }}>{resumen.totalUnidadesMerma}</p>
                    </div>
                    <LuPackageX size={22} color="#dc6b4f" style={{ opacity: 0.6 }} />
                </div>

                <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', borderLeft: '4px solid #8b3a3a', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>Valor estimado perdido</p>
                        <p style={{ fontSize: 28, fontWeight: 700, margin: 0, color: '#173023' }}>${Number(resumen.valorEstimadoPerdido).toFixed(2)}</p>
                    </div>
                    <LuDollarSign size={22} color="#8b3a3a" style={{ opacity: 0.6 }} />
                </div>

                {motivoPrincipal && (
                    <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', borderLeft: `4px solid ${obtenerConfigMotivo(motivoPrincipal.motivo).color}`, boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>Causa más frecuente</p>
                            <p style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#173023' }}>{motivoPrincipal.motivo}</p>
                        </div>
                        {React.createElement(obtenerConfigMotivo(motivoPrincipal.motivo).icono, { size: 22, color: obtenerConfigMotivo(motivoPrincipal.motivo).color, style: { opacity: 0.7 } })}
                    </div>
                )}
            </div>

            {cargando ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af', fontSize: 14 }}>Cargando reporte...</div>
            ) : resumen.totalAjustes === 0 ? (
                <div style={{ background: '#fff', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
                    <LuTrendingDown size={36} color="#d1d5db" style={{ marginBottom: 12 }} />
                    <p style={{ fontSize: 15, fontWeight: 600, color: '#374151', margin: '0 0 6px' }}>Sin mermas registradas</p>
                    <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>
                        {fechaDesde || fechaHasta
                            ? 'No hay ajustes en el rango de fechas seleccionado.'
                            : 'Cuando cierres un conteo de inventario físico con diferencias, aparecerán aquí.'}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 18 }}>

                    {/* Gráfico: mermas por producto */}
                    <div className="modal-content" style={{ maxWidth: 'none' }}>
                        <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 0, marginBottom: 4, color: '#173023' }}>Valor perdido por producto</h2>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 0, marginBottom: 16 }}>Los productos con mayor impacto económico primero</p>
                        <ResponsiveContainer width="100%" height={Math.max(220, porProducto.length * 32)}>
                            <BarChart data={porProducto} layout="vertical" margin={{ left: 40, right: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                                <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} />
                                <YAxis type="category" dataKey="nombreProducto" width={130} tick={{ fontSize: 11, fill: '#4b5563' }} axisLine={{ stroke: '#e5e7eb' }} />
                                <Tooltip
                                    formatter={(value: any) => [`$${Number(value || 0).toFixed(2)}`, 'Valor perdido']}
                                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                                />
                                <Bar dataKey="valorPerdido" fill="#dc6b4f" radius={[0, 6, 6, 0]} maxBarSize={22} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Gráfico: distribución por motivo */}
                    <div className="modal-content" style={{ maxWidth: 'none' }}>
                        <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 0, marginBottom: 4, color: '#173023' }}>Distribución por motivo</h2>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 0, marginBottom: 16 }}>Qué tanto pesa cada causa en el total de unidades</p>
                        <ResponsiveContainer width="100%" height={240}>
                            <PieChart>
                                <Pie
                                    data={porMotivo}
                                    dataKey="unidadesMerma"
                                    nameKey="motivo"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={90}
                                    paddingAngle={2}
                                >
                                    {porMotivo.map((entry, index) => (
                                        <Cell key={index} fill={obtenerConfigMotivo(entry.motivo).color} stroke="#fff" strokeWidth={2} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: any, _name: any, item: any) => [`${value} unidades`, item.payload.motivo]}
                                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Leyenda propia con ícono, en vez de la leyenda plana de recharts */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', justifyContent: 'center', marginTop: 8 }}>
                            {porMotivo.map((m, i) => {
                                const cfg = obtenerConfigMotivo(m.motivo);
                                const Icono = cfg.icono;
                                return (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#4b5563' }}>
                                        <Icono size={13} color={cfg.color} />
                                        <span>{m.motivo}</span>
                                        <span style={{ color: '#9ca3af' }}>({m.unidadesMerma})</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Gráfico: evolución mensual */}
                    <div className="modal-content" style={{ maxWidth: 'none', gridColumn: '1 / -1' }}>
                        <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 0, marginBottom: 4, color: '#173023' }}>Evolución mensual</h2>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 0, marginBottom: 16 }}>Unidades perdidas y su valor en dólares, mes a mes</p>
                        <ResponsiveContainer width="100%" height={260}>
                            <LineChart data={mensual} margin={{ right: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} />
                                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} />
                                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                <Line yAxisId="left" type="monotone" dataKey="unidadesMerma" name="Unidades" stroke="#dc6b4f" strokeWidth={2.5} dot={{ r: 3 }} />
                                <Line yAxisId="right" type="monotone" dataKey="valorPerdido" name="Valor ($)" stroke="#115e59" strokeWidth={2.5} dot={{ r: 3 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReporteMermas;