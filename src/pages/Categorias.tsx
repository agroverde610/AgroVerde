import React, { useState, useEffect } from 'react';
import { LuSearch, LuTrash2, LuX, LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { FiEdit } from "react-icons/fi";
import api from '../services/api';
import '../App.css';

interface Categoria {
    id_categoria: number;
    nombre: string;
    descripcion: string | null;
    estado: boolean;
}

interface CategoriaForm {
    id_categoria: number;
    nombre: string;
    descripcion: string;
    estado: boolean;
}

const Categorias: React.FC = () => {
    const [columnaOrden, setColumnaOrden] = useState<string>('nombre');
    const [direccionOrden, setDireccionOrden] = useState<'asc' | 'desc'>('asc');

    const [categorias, setCategorias] = useState<Categoria[]>([]);

    const [cargando, setCargando] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [modalAbierto, setModalAbierto] = useState<boolean>(false);
    const [modoModal, setModoModal] = useState<'crear' | 'editar' | 'ver'>('crear');
    const [guardando, setGuardando] = useState<boolean>(false);

    const [busqueda, setBusqueda] = useState('');
    const [paginaActual, setPaginaActual] = useState(1);
    const elementosPorPagina = 10;

    const estadoInicialForm: CategoriaForm = {
        id_categoria: 0,
        nombre: '',
        descripcion: '',
        estado: true
    };

    const [formData, setFormData] = useState<CategoriaForm>(estadoInicialForm);

    useEffect(() => {
        cargarCategorias();
    }, []);

    useEffect(() => {
        setPaginaActual(1);
    }, [busqueda]);

    // Carga de categorías
    const cargarCategorias = async () => {
        try {
            setCargando(true);
            setError(null);

            const resCategorias = await api.get('/Categorias/Listar');

            if (resCategorias.data && resCategorias.data.success) {
                // 💡 MAPEAMOS AQUÍ PARA ADAPTAR CAMELCASE A SNAKE_CASE
                const categoriasAdaptadas = resCategorias.data.data.map((c: any) => ({
                    id_categoria: c.idCategoria,
                    nombre: c.nombre,
                    descripcion: c.descripcion,
                    estado: c.estado
                }));

                setCategorias(categoriasAdaptadas);
            } else {
                setError(resCategorias.data?.mensaje || 'No se pudieron recuperar las categorías.');
            }

        } catch (err: any) {
            console.error("Error cargando categorías:", err);
            setError(err.response?.data?.mensaje || 'Error de conexión al cargar datos');
        } finally {
            setCargando(false);
        }
    };

    const abrirModalCrear = () => {
        setFormData(estadoInicialForm);
        setModoModal('crear');
        setModalAbierto(true);
    };

    const abrirModalEditar = (categoria: Categoria) => {
        setFormData({
            id_categoria: categoria.id_categoria,
            nombre: categoria.nombre || '',
            descripcion: categoria.descripcion || '',
            estado: categoria.estado ?? true
        });
        setModoModal('editar');
        setModalAbierto(true);
    };

    const abrirModalVer = (categoria: Categoria) => {
        abrirModalEditar(categoria);
        setModoModal('ver');
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, type, value } = e.target;

        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleGuardar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (modoModal === 'ver') return;

        setGuardando(true);
        setError(null);

        try {
            // 💡 El backend espera JSON (FromBody), no FormData
            const payload: any = {
                Nombre: formData.nombre.trim(),
                Descripcion: formData.descripcion.trim() || null,
                Estado: formData.estado
            };

            let respuesta;
            if (modoModal === 'crear') {
                respuesta = await api.post('/Categorias/Agregar', payload);
            } else {
                payload.IdCategoria = formData.id_categoria;
                respuesta = await api.put('/Categorias/Modificar', payload);
            }

            if (respuesta.data && respuesta.data.success) {
                alert(modoModal === 'crear' ? 'Categoría registrada con éxito' : 'Categoría actualizada con éxito');
                setModalAbierto(false);
                await cargarCategorias();
            } else {
                setError(respuesta.data?.mensaje || 'Ocurrió un problema al procesar la categoría.');
            }
        } catch (err: any) {
            console.error("Error en handleGuardar:", err);

            const mensajeError = err.response?.data?.mensaje || 'Error de servidor al procesar la solicitud.';

            // 💡 VENTANA EMERGENTE DE ERROR CON OK
            alert(`❌ Error: ${mensajeError}`);

            setError(mensajeError);
        } finally {
            setGuardando(false);
        }
    };

    const handleEliminar = async (id: number, nombre: string) => {
        const confirmar = window.confirm(`¿Estás seguro de que deseas eliminar la categoría "${nombre}"?`);

        if (confirmar) {
            try {
                const respuesta = await api.delete(`/Categorias/Eliminar/${id}`);
                if (respuesta.data && respuesta.data.success) {
                    alert('Categoría eliminada correctamente.');
                    await cargarCategorias();
                } else {
                    alert(respuesta.data?.mensaje || 'No se pudo eliminar la categoría.');
                }
            } catch (err: any) {
                console.error("Error en handleEliminar:", err);
                alert(err.response?.data?.mensaje || 'Error al eliminar la categoría');
            }
        }
    };

    const categoriasFiltradas = categorias.filter(categoria => {
        const termino = busqueda.toLowerCase();
        return (
            (categoria.nombre?.toLowerCase() || '').includes(termino) ||
            (categoria.descripcion?.toLowerCase() || '').includes(termino)
        );
    });

    const indiceUltimoElemento = paginaActual * elementosPorPagina;
    const indicePrimerElemento = indiceUltimoElemento - elementosPorPagina;

    const manejarOrden = (columna: string) => {
        if (columnaOrden === columna) {
            setDireccionOrden(direccionOrden === 'asc' ? 'desc' : 'asc');
        } else {
            setColumnaOrden(columna);
            setDireccionOrden('asc');
        }
    };

    const categoriasOrdenadas = [...categoriasFiltradas].sort((a: any, b: any) => {
        let valA = a[columnaOrden];
        let valB = b[columnaOrden];

        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (typeof valA === 'string') {
            return direccionOrden === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return direccionOrden === 'asc' ? valA - valB : valB - valA;
    });

    const categoriasActuales = categoriasOrdenadas.slice(indicePrimerElemento, indiceUltimoElemento);

    const totalPaginas = Math.ceil(categoriasFiltradas.length / elementosPorPagina);

    return (
        <div className="clientes-wrapper">
            <div className="clientes-header">
                <h1 className="clientes-title">Gestión de Categorías </h1>
            </div>

            {error && <div className="error-message" style={{ color: 'red', margin: '10px 0' }}>{error}</div>}

            <div className="clientes-controls">
                <div className="control-box flex-grow">
                    <span className="control-label"> Búsqueda Inteligente</span>
                    <div className="search-input-group">
                        <input
                            type="text"
                            placeholder="Buscar por Nombre o Descripción..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                        <button className="btn" type="button"><LuSearch /></button>
                    </div>
                </div>

                <div className="control-box action-box">
                    <span className="control-label">Acción</span>
                    <button className="btn" type="button" onClick={abrirModalCrear}>
                        Nueva Categoría
                    </button>
                </div>
            </div>

            <div className="table-container">
                {cargando ? (
                    <div className="text-center" style={{ padding: '20px' }}>Cargando categorías...</div>
                ) : (
                    <>
                        <table className="clientes-table">
                            <thead>
                                <tr>
                                    <th className="th-ordenable" onClick={() => manejarOrden('nombre')}>
                                        Nombre
                                        {columnaOrden === 'nombre' && (
                                            direccionOrden === 'asc'
                                                ? <span style={{ color: '#00e676', fontSize: '18px', fontWeight: 'bold', marginLeft: '6px' }}>🡡</span>
                                                : <span style={{ color: '#ff1744', fontSize: '18px', fontWeight: 'bold', marginLeft: '6px' }}>🡣</span>
                                        )}
                                    </th>

                                    <th className="th-ordenable" onClick={() => manejarOrden('descripcion')}>
                                        Descripción
                                        {columnaOrden === 'descripcion' && (
                                            direccionOrden === 'asc'
                                                ? <span style={{ color: '#00e676', fontSize: '18px', fontWeight: 'bold', marginLeft: '6px' }}>🡡</span>
                                                : <span style={{ color: '#ff1744', fontSize: '18px', fontWeight: 'bold', marginLeft: '6px' }}>🡣</span>
                                        )}
                                    </th>

                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categoriasActuales.map((categoria) => (
                                    <tr key={categoria.id_categoria}>
                                        <td><strong>{categoria.nombre}</strong></td>
                                        <td>{categoria.descripcion || '-'}</td>
                                        <td>
                                            <label className="switch">
                                                <input type="checkbox" checked={!!categoria.estado} readOnly />
                                                <span className="slider round"></span>
                                            </label>
                                        </td>
                                        <td>
                                            <div className="actions-cell">
                                                <button className="btn-action-text" type="button" onClick={() => abrirModalVer(categoria)}>
                                                    Ver
                                                </button>
                                                <button className="btn-icon edit" type="button" title="Editar" onClick={() => abrirModalEditar(categoria)}>
                                                    <FiEdit />
                                                </button>
                                                <button className="btn-icon delete" type="button" title="Eliminar" onClick={() => handleEliminar(categoria.id_categoria, categoria.nombre)}>
                                                    <LuTrash2 />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {categoriasActuales.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="text-center" style={{ padding: '20px' }}>
                                            {busqueda === '' ? 'No hay categorías registradas.' : 'No se encontraron resultados.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        {categoriasFiltradas.length > 0 && (
                            <div className="pagination-container">
                                <span className="pagination-info">
                                    Mostrando {indicePrimerElemento + 1} a {Math.min(indiceUltimoElemento, categoriasFiltradas.length)} de {categoriasFiltradas.length} registros
                                </span>
                                <div className="pagination-buttons">
                                    <button
                                        type="button"
                                        className="btn-pagination"
                                        disabled={paginaActual === 1}
                                        onClick={() => setPaginaActual(paginaActual - 1)}
                                    >
                                        <LuChevronLeft /> Anterior
                                    </button>
                                    <span className="pagination-current">
                                        Página {paginaActual} de {totalPaginas}
                                    </span>
                                    <button
                                        type="button"
                                        className="btn-pagination"
                                        disabled={paginaActual === totalPaginas}
                                        onClick={() => setPaginaActual(paginaActual + 1)}
                                    >
                                        Siguiente <LuChevronRight />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {modalAbierto && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>
                                {modoModal === 'crear' && 'Registrar Nueva Categoría'}
                                {modoModal === 'editar' && 'Editar Categoría'}
                                {modoModal === 'ver' && 'Detalles de la Categoría'}
                            </h2>
                            <button className="btn-close" type="button" onClick={() => setModalAbierto(false)}>
                                <LuX />
                            </button>
                        </div>
                        <form onSubmit={handleGuardar}>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Nombre de la Categoría</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        name="nombre"
                                        required
                                        value={formData.nombre}
                                        onChange={handleChange}
                                        disabled={modoModal === 'ver'}
                                    />
                                </div>
                                <div className="form-group full-width">
                                    <label className="form-label">Descripción</label>
                                    <textarea
                                        className="form-input"
                                        name="descripcion"
                                        rows={3}
                                        value={formData.descripcion}
                                        onChange={handleChange}
                                        disabled={modoModal === 'ver'}
                                    />
                                </div>
                                {modoModal !== 'crear' && (
                                    <div className="form-group full-width" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <label className="form-label" style={{ marginBottom: 0 }}>Estado Activo:</label>
                                        <label className="switch">
                                            <input
                                                type="checkbox"
                                                name="estado"
                                                checked={!!formData.estado}
                                                onChange={handleChange}
                                                disabled={modoModal === 'ver'}
                                            />
                                            <span className="slider round"></span>
                                        </label>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-cancelar" onClick={() => setModalAbierto(false)}>
                                    {modoModal === 'ver' ? 'Cerrar' : 'Cancelar'}
                                </button>
                                {modoModal !== 'ver' && (
                                    <button type="submit" className="btn-guardar" disabled={guardando}>
                                        {guardando ? 'Guardando...' : (modoModal === 'crear' ? 'Guardar Categoría' : 'Actualizar Cambios')}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Categorias;
