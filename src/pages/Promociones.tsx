import React, { useState, useEffect, useMemo } from 'react';
import { LuSearch, LuPlus, LuTag, LuTrash2 } from "react-icons/lu";
import { FiEdit } from "react-icons/fi";
import api from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';
import '../App.css';

type Estado = 'activa' | 'por_vencer' | 'vencida' | 'inactiva';

const ESTADO_CONFIG: Record<Estado, { label: string; bg: string; color: string }> = {
    activa: { label: 'Activa', bg: '#EAF3DE', color: '#27500A' },
    por_vencer: { label: 'Por vencer', bg: '#FAEEDA', color: '#633806' },
    vencida: { label: 'Vencida', bg: '#FCEBEB', color: '#791F1F' },
    inactiva: { label: 'Inactiva', bg: '#F1EFE8', color: '#444441' },
};

const calcularEstado = (fechaFin: string, activo: boolean): Estado => {
    if (!activo) return 'inactiva';

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fin = new Date(fechaFin);
    fin.setHours(0, 0, 0, 0);
    const diasParaVencer = Math.ceil((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    if (diasParaVencer < 0) return 'vencida';
    if (diasParaVencer <= 3) return 'por_vencer';
    return 'activa';
};

const EstadoBadge: React.FC<{ estado: Estado }> = ({ estado }) => {
    const cfg = ESTADO_CONFIG[estado];
    return (
        <span style={{
            background: cfg.bg,
            color: cfg.color,
            fontSize: 12,
            fontWeight: 500,
            padding: '3px 10px',
            borderRadius: 6,
            display: 'inline-block',
            whiteSpace: 'nowrap',
        }}>
            {cfg.label}
        </span>
    );
};

const Promociones: React.FC = () => {
    const [vista, setVista] = useState<'nueva' | 'todas'>('todas');
    const [listaPromos, setListaPromos] = useState<any[]>([]);
    const [productos, setProductos] = useState<any[]>([]);
    const [categorias, setCategorias] = useState<any[]>([]);
    const [modo, setModo] = useState<'productos' | 'categoria'>('productos');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState<'todos' | Estado>('todos');
    const [idAEliminar, setIdAEliminar] = useState<number | null>(null);
    const [guardando, setGuardando] = useState(false);
    const [busquedaAsignacion, setBusquedaAsignacion] = useState('');

    // Estado para capturar y mostrar el error de fechas en tiempo real
    const [errorFechas, setErrorFechas] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        idPromocion: 0,
        nombre: '',
        porcentaje: 0,
        fechaInicio: '',
        fechaFin: '',
        idCategoria: 0
    });

    useEffect(() => { cargarDatos(); }, []);

    const cargarDatos = async () => {
        const [resProds, resPromos, resCats] = await Promise.all([
            api.get('productos/listar'),
            api.get('promociones/listar'),
            api.get('categorias/listar')
        ]);
        setProductos(resProds.data.data);
        setListaPromos(resPromos.data.data);
        setCategorias(resCats.data.data);
    };

    // Función que evalúa la validez de las fechas al instante
    const validarFechasAlInstante = (inicio: string, fin: string, idPromocion: number) => {
        const hoy = new Date().toISOString().split('T')[0];

        if (!inicio) {
            setErrorFechas(null);
            return;
        }

        if (idPromocion === 0 && inicio < hoy) {
            setErrorFechas("La fecha de inicio no puede ser menor al día de hoy.");
            return;
        }

        if (fin && fin < inicio) {
            setErrorFechas("La fecha de fin no puede ser anterior a la fecha de inicio.");
            return;
        }

        setErrorFechas(null);
    };

    const handleGuardar = async (e: React.FormEvent) => {
        e.preventDefault();

        if (errorFechas) {
            alert(`Por favor corrige las fechas: ${errorFechas}`);
            return;
        }

        setGuardando(true);
        try {
            await api.post('promociones/guardar', {
                ...formData,
                ProductosIds: modo === 'productos' ? selectedIds : [],
                CategoriasIds: modo === 'categoria' ? selectedIds : []
            });
            setVista('todas');
            cargarDatos();
            setFormData({ idPromocion: 0, nombre: '', porcentaje: 0, fechaInicio: '', fechaFin: '', idCategoria: 0 });
            setSelectedIds([]);
            setErrorFechas(null);
            setBusquedaAsignacion('');
        } catch (error) {
            console.error(error);
            alert("Error al guardar la promoción.");
        } finally {
            setGuardando(false);
        }
    };

    const abrirEditar = (p: any) => {
        const fInicio = p.fechaInicio ? p.fechaInicio.split('T')[0] : '';
        const fFin = p.fechaFin ? p.fechaFin.split('T')[0] : '';

        setFormData({
            idPromocion: p.idPromocion,
            nombre: p.nombre,
            porcentaje: p.porcentaje,
            fechaInicio: fInicio,
            fechaFin: fFin,
            idCategoria: 0
        });

        // Detectamos el modo evaluando si vienen IDs de categorías o de productos
        const esCategoria = p.categoriasIds && p.categoriasIds.length > 0;

        setModo(esCategoria ? 'categoria' : 'productos');

        // Asignamos a selectedIds el arreglo correspondiente
        setSelectedIds(esCategoria ? p.categoriasIds : (p.productosIds || []));

        setVista('nueva');
        validarFechasAlInstante(fInicio, fFin, p.idPromocion);
    };

    const handleDesactivar = (id: number) => {
        setIdAEliminar(id);
    };

    const confirmarDesactivar = async () => {
        if (idAEliminar === null) return;
        try {
            await api.delete(`promociones/desactivar/${idAEliminar}`);
            setIdAEliminar(null);
            cargarDatos();
        } catch (error) {
            console.error('Error al desactivar promoción:', error);
            alert('No se pudo desactivar la promoción. Revisa la consola para más detalles.');
        }
    };

    const promosConEstado = useMemo(
        () => listaPromos.map(p => ({ ...p, estadoCalculado: calcularEstado(p.fechaFin, p.estado) })),
        [listaPromos]
    );

    const resumen = useMemo(() => {
        const activas = promosConEstado.filter(p => p.estadoCalculado === 'activa').length;
        const porVencer = promosConEstado.filter(p => p.estadoCalculado === 'por_vencer').length;
        const promedio = promosConEstado.length > 0
            ? (promosConEstado.reduce((sum, p) => sum + p.porcentaje, 0) / promosConEstado.length).toFixed(1)
            : '0';
        return { activas, porVencer, promedio };
    }, [promosConEstado]);

    const promosFiltradas = useMemo(() => {
        return promosConEstado.filter(p => {
            const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
            const coincideFiltro = filtroEstado === 'todos' || p.estadoCalculado === filtroEstado;
            return coincideBusqueda && coincideFiltro;
        });
    }, [promosConEstado, busqueda, filtroEstado]);

    const hoy = new Date().toISOString().split('T')[0];

    const categoriasFiltradas = categorias.filter(c =>
        c.nombre.toLowerCase().includes(busquedaAsignacion.toLowerCase())
    );

    const productosFiltrados = productos.filter(p =>
        p.nombre.toLowerCase().includes(busquedaAsignacion.toLowerCase())
    );

    // Lista actualmente visible según el modo (productos o categorías) y la búsqueda de asignación
    const listaActual = modo === 'categoria' ? categoriasFiltradas : productosFiltrados;
    const idsListaActual = listaActual.map((item: any) =>
        modo === 'categoria' ? item.idCategoria : item.idProducto
    );
    const todosSeleccionados = idsListaActual.length > 0 && idsListaActual.every(id => selectedIds.includes(id));

    // Selecciona o deselecciona todos los elementos visibles actualmente (respeta el filtro de búsqueda)
    const toggleSeleccionarTodos = (checked: boolean) => {
        if (checked) {
            setSelectedIds(prev => Array.from(new Set([...prev, ...idsListaActual])));
        } else {
            setSelectedIds(prev => prev.filter(id => !idsListaActual.includes(id)));
        }
    };

    return (
        <div className="clientes-wrapper">
            <div className="clientes-header">
                <h1 className="clientes-title">Gestión de Promociones</h1>
            </div>

            <div className="clientes-controls" style={{ gap: '20px', borderBottom: '1px solid #ddd', paddingBottom: '10px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '20px' }}>
                    <button className="btn" onClick={() => {
                        setVista('nueva');
                        setFormData({ idPromocion: 0, nombre: '', porcentaje: 0, fechaInicio: '', fechaFin: '', idCategoria: 0 });
                        setSelectedIds([]);
                        setErrorFechas(null);
                    }}><LuPlus /> Nueva</button>
                    <button className="btn" onClick={() => setVista('todas')}><LuTag /> Listado</button>
                </div>

                {vista === 'todas' && (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ position: 'relative' }}>
                            <LuSearch style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                            <input
                                className="form-input"
                                style={{ paddingLeft: '30px', width: '200px' }}
                                placeholder="Buscar promoción..."
                                value={busqueda}
                                onChange={e => setBusqueda(e.target.value)}
                            />
                        </div>
                        <select className="form-input" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value as any)}>
                            <option value="todos">Todos los estados</option>
                            <option value="activa">Activas</option>
                            <option value="por_vencer">Por vencer</option>
                            <option value="vencida">Vencidas</option>
                        </select>
                    </div>
                )}
            </div>

            {vista === 'nueva' ? (
                <form onSubmit={handleGuardar} className="modal-content" style={{ maxWidth: '600px', margin: '20px auto' }}>
                    <div className="modal-body">
                    <div className="form-grid">
                        <div className="form-group full-width">
                            <label className="form-label">Nombre de la Promoción</label>
                            <input
                                className="form-input"
                                value={formData.nombre}
                                placeholder="Ej: Descuento Navideño"
                                required
                                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                            />
                        </div>

                        <div className="form-group full-width">
                            <label className="form-label">Porcentaje de Descuento</label>
                            <input
                                className="form-input"
                                type="number"
                                value={formData.porcentaje}
                                placeholder="% Descuento"
                                required
                                onChange={e => setFormData({ ...formData, porcentaje: Number(e.target.value) })}
                            />
                        </div>

                        {/* FECHA DE INICIO */}
                        <div className="form-group">
                            <label className="form-label">Fecha de Inicio</label>
                            <input
                                className="form-input"
                                type="date"
                                value={formData.fechaInicio}
                                required
                                min={formData.idPromocion === 0 ? hoy : undefined} // Bloquea fechas en el pasado
                                onChange={e => {
                                    const nuevaFechaInicio = e.target.value;
                                    const nuevaFechaFin = formData.fechaFin && formData.fechaFin < nuevaFechaInicio ? '' : formData.fechaFin;

                                    setFormData({
                                        ...formData,
                                        fechaInicio: nuevaFechaInicio,
                                        fechaFin: nuevaFechaFin
                                    });

                                    validarFechasAlInstante(nuevaFechaInicio, nuevaFechaFin, formData.idPromocion);
                                }}
                            />
                        </div>

                        {/* FECHA DE FIN */}
                        <div className="form-group">
                            <label className="form-label">Fecha de Fin</label>
                            <input
                                className="form-input"
                                type="date"
                                value={formData.fechaFin}
                                required
                                min={formData.fechaInicio || (formData.idPromocion === 0 ? hoy : undefined)}
                                onChange={e => {
                                    const nuevaFechaFin = e.target.value;
                                    setFormData({ ...formData, fechaFin: nuevaFechaFin });

                                    // Pasamos el id actual
                                    validarFechasAlInstante(formData.fechaInicio, nuevaFechaFin, formData.idPromocion);
                                }}
                            />
                        </div>

                        {/* MENSAJE DE ERROR QUE SE RENDERIZA AL INSTANTE */}
                        {errorFechas && (
                            <div className="form-group full-width" style={{ color: '#d9534f', fontSize: '13px', fontWeight: 'bold', marginTop: '5px' }}>
                                ⚠️ {errorFechas}
                            </div>
                        )}
                    </div>

                    <div style={{ marginTop: '15px' }}>
                        <label className="form-label">Modo de aplicación:</label>
                        <select className="form-input" value={modo} onChange={(e) => { setModo(e.target.value as any); setSelectedIds([]); }}>
                            <option value="productos">Por Productos</option>
                            <option value="categoria">Por Categoría</option>
                        </select>
                    </div>

                    <div style={{ marginTop: '15px' }}>
                        <label className="form-label">
                            Seleccionar {modo === 'categoria' ? 'Categorías' : 'Productos'}:
                        </label>

                        {/* Input de Búsqueda */}
                        <input
                            type="text"
                            className="form-input"
                            placeholder={`Buscar ${modo === 'categoria' ? 'categoría' : 'producto'}...`}
                            value={busquedaAsignacion}
                            onChange={(e) => setBusquedaAsignacion(e.target.value)}
                            style={{ marginBottom: '10px', width: '100%' }}
                        />

                        {/* Checkbox para seleccionar/deseleccionar todos los elementos visibles */}
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginBottom: 10 }}>
                            <input
                                type="checkbox"
                                checked={todosSeleccionados}
                                onChange={e => toggleSeleccionarTodos(e.target.checked)}
                            />
                            Seleccionar {modo === 'categoria' ? 'todas las categorías' : 'todos los productos'}
                            {selectedIds.length > 0 && (
                                <span style={{ color: '#6c757d', fontWeight: 400 }}>
                                    ({selectedIds.length} seleccionado{selectedIds.length !== 1 ? 's' : ''})
                                </span>
                            )}
                        </label>

                        <div className="table-container" style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px', padding: '10px' }}>
                            {modo === 'categoria' ? (
                                categoriasFiltradas.length > 0 ? (
                                    categoriasFiltradas.map(c => (
                                        <div key={c.idCategoria} style={{ padding: '5px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(c.idCategoria)}
                                                onChange={e => setSelectedIds(prev => e.target.checked ? [...prev, c.idCategoria] : prev.filter(i => i !== c.idCategoria))}
                                            />
                                            <span>{c.nombre}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>No se encontraron categorías.</p>
                                )
                            ) : (
                                productosFiltrados.length > 0 ? (
                                    productosFiltrados.map(p => (
                                        <div key={p.idProducto} style={{ padding: '5px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(p.idProducto)}
                                                onChange={e => setSelectedIds(prev => e.target.checked ? [...prev, p.idProducto] : prev.filter(i => i !== p.idProducto))}
                                            />
                                            <span>{p.nombre}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>No se encontraron productos.</p>
                                )
                            )}
                        </div>
                    </div>
                    </div>

                    <div className="modal-footer" style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn-cancelar" onClick={() => { setVista('todas'); setBusquedaAsignacion(''); }}>Cancelar</button>
                        <button
                            type="submit"
                            className="btn-guardar"
                            disabled={!!errorFechas || guardando}
                        >
                            {guardando ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            ) : (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', margin: '20px 0' }}>
                        <div style={{ background: '#f5f5f2', borderRadius: '8px', padding: '1rem' }}>
                            <p style={{ fontSize: 13, color: '#6c757d', margin: '0 0 4px' }}>Activas</p>
                            <p style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>{resumen.activas}</p>
                        </div>
                        <div style={{ background: '#f5f5f2', borderRadius: '8px', padding: '1rem' }}>
                            <p style={{ fontSize: 13, color: '#6c757d', margin: '0 0 4px' }}>Por vencer (3 días)</p>
                            <p style={{ fontSize: 24, fontWeight: 600, margin: 0, color: '#b45309' }}>{resumen.porVencer}</p>
                        </div>
                        <div style={{ background: '#f5f5f2', borderRadius: '8px', padding: '1rem' }}>
                            <p style={{ fontSize: 13, color: '#6c757d', margin: '0 0 4px' }}>Descuento promedio</p>
                            <p style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>{resumen.promedio}%</p>
                        </div>
                    </div>

                    <div className="table-container">
                        <table className="clientes-table">
                            <thead><tr><th>Nombre</th><th>%</th><th>Vigencia</th><th>Estado</th><th>Acciones</th></tr></thead>
                            <tbody>
                                {promosFiltradas.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', color: '#888', padding: '20px' }}>
                                            No se encontraron promociones.
                                        </td>
                                    </tr>
                                ) : (
                                    promosFiltradas.map(p => (
                                        <tr key={p.idPromocion}>
                                            <td>{p.nombre}</td>
                                            <td>
                                                <span style={{ background: '#e6f1fb', color: '#0c447c', fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 6 }}>
                                                    {p.porcentaje}%
                                                </span>
                                            </td>
                                            <td>{new Date(p.fechaFin).toLocaleDateString()}</td>
                                            <td><EstadoBadge estado={p.estadoCalculado} /></td>
                                            <td>
                                                <button className="btn-icon" onClick={() => abrirEditar(p)}><FiEdit /></button>
                                                <button className="btn-icon" onClick={() => handleDesactivar(p.idPromocion)}><LuTrash2 /></button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            <ConfirmDialog
                open={idAEliminar !== null}
                titulo="Desactivar promoción"
                mensaje="Esta promoción dejará de aplicarse a los productos asociados. ¿Deseas continuar?"
                variante="destructiva"
                textoConfirmar="Desactivar"
                onConfirmar={confirmarDesactivar}
                onCancelar={() => setIdAEliminar(null)}
            />
        </div>
    );
};
export default Promociones;