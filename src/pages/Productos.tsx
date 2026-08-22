import React, { useState, useEffect } from 'react';
import { LuSearch, LuCamera, LuTrash2, LuX, LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { FiEdit } from "react-icons/fi";
import type { Producto } from '../interfaces/Productos';
import api from '../services/api';
import '../App.css';


interface CategoriasCatalogo {
    id_categoria: number;
    nombre: string;
    descripcion?: string;
    id_unidad_sugerida?: number | null;
}

interface UnidadesCatalogo {
    id_unidad: number;
    nombre: string;
    permite_decimales?: boolean;
}

interface ProductoForm extends Omit<Producto, 'imagen'> {
    imagen: string | File | null;
}

const iconosCategorias: Record<string, string> = {
    'Semillas': '🌱',
    'Fertilizantes': '🧪',
    'Herramientas': '🛠️',
    'Fitosanitarios': '🧴',
    'Riego': '💧',
};

const parsearDecimal = (texto: string): number => {
    const normalizado = texto.replace(',', '.');
    const valor = parseFloat(normalizado);
    return isNaN(valor) ? 0 : valor;
};

const Productos: React.FC = () => {
    const [columnaOrden, setColumnaOrden] = useState<string>('nombre');
    const [direccionOrden, setDireccionOrden] = useState<'asc' | 'desc'>('asc');

    const [productos, setProductos] = useState<Producto[]>([]);
    const [categorias, setCategorias] = useState<CategoriasCatalogo[]>([]);
    const [unidades, setUnidades] = useState<UnidadesCatalogo[]>([]);

    const [cargando, setCargando] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [modalAbierto, setModalAbierto] = useState<boolean>(false);
    const [modoModal, setModoModal] = useState<'crear' | 'editar' | 'ver'>('crear');
    const [guardando, setGuardando] = useState<boolean>(false);

    const [busqueda, setBusqueda] = useState('');
    const [categoriaActiva, setCategoriaActiva] = useState<number | null>(null);
    const [paginaActual, setPaginaActual] = useState(1);
    const elementosPorPagina = 10;

    const [modoPrecioVenta, setModoPrecioVenta] = useState<'manual' | 'porcentaje'>('manual');

    const [precioCompraTexto, setPrecioCompraTexto] = useState<string>('');
    const [precioVentaTexto, setPrecioVentaTexto] = useState<string>('');
    const [porcentajeGananciaTexto, setPorcentajeGananciaTexto] = useState<string>('');
    const porcentajeGanancia = porcentajeGananciaTexto === '' ? '' : parsearDecimal(porcentajeGananciaTexto);

    const estadoInicialForm: ProductoForm = {
        id_producto: 0,
        id_categoria: null,
        id_unidad: null,
        codigo_barras: '',
        nombre: '',
        precio_compra: 0,
        precio_venta: 0,
        stock_actual: 0,
        stock_minimo: 0,
        estado: true,
        imagen: null,
        codigo_impuesto_sri: ''
    };

    const [formData, setFormData] = useState<ProductoForm>(estadoInicialForm);

    useEffect(() => {
        cargarDatosIniciales();
    }, []);

    useEffect(() => {
        setPaginaActual(1);
    }, [busqueda, categoriaActiva]);

    useEffect(() => {
        if (modoPrecioVenta !== 'porcentaje') return;

        const compra = parsearDecimal(precioCompraTexto);
        const pct = porcentajeGanancia === '' ? 0 : porcentajeGanancia;
        const nuevoVenta = compra + (compra * pct / 100);
        const nuevoVentaRedondeado = Number(nuevoVenta.toFixed(2));

        setFormData(prev => ({ ...prev, precio_compra: compra, precio_venta: nuevoVentaRedondeado }));
        setPrecioVentaTexto(String(nuevoVentaRedondeado));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [modoPrecioVenta, porcentajeGananciaTexto, precioCompraTexto]);

    const cargarDatosIniciales = async () => {
        try {
            setCargando(true);
            setError(null);

            const [resProductos, resCategorias, resUnidades] = await Promise.all([
                api.get('/productos/Listar'),
                api.get('/ventas/Categorias').catch(() => ({ data: { success: false, data: [] } })),
                api.get('/productos/ListarUnidades').catch(() => ({ data: { success: false, data: [] } }))
            ]);

            if (resProductos.data && resProductos.data.success) {
                const productosAdaptados = resProductos.data.data.map((p: any) => ({
                    id_producto: p.idProducto,
                    id_categoria: p.idCategoria,
                    id_unidad: p.idUnidad,
                    codigo_barras: p.codigoBarras,
                    nombre: p.nombre,
                    precio_compra: p.precioCompra,
                    precio_venta: p.precioVenta,
                    stock_actual: p.stockActual,
                    stock_minimo: p.stockMinimo,
                    estado: p.estado,
                    imagen: p.imagen,
                    codigo_impuesto_sri: p.codigoImpuestoSri
                }));

                setProductos(productosAdaptados);
            } else {
                setError(resProductos.data?.mensaje || 'No se pudieron recuperar los productos.');
            }

            if (resCategorias.data && resCategorias.data.success) {
                const categoriasAdaptadas = resCategorias.data.data.map((cat: any) => ({
                    id_categoria: cat.idCategoria ?? cat.id_categoria,
                    nombre: cat.nombre,
                    descripcion: cat.descripcion ?? '',
                    id_unidad_sugerida: cat.idUnidadSugerida ?? null
                }));
                setCategorias(categoriasAdaptadas);
            }

            if (resUnidades.data && resUnidades.data.success) {
                const unidadesAdaptadas = resUnidades.data.data.map((uni: any) => ({
                    id_unidad: uni.idUnidad || uni.id_unidad,
                    nombre: uni.nombre,
                    permite_decimales: uni.permiteDecimales ?? true
                }));
                setUnidades(unidadesAdaptadas);
            }

        } catch (err: any) {
            console.error("Error cargando datos iniciales:", err);
            setError(err.response?.data?.mensaje || 'Error de conexión al cargar datos');
        } finally {
            setCargando(false);
        }
    };

    const abrirModalCrear = () => {
        setFormData(estadoInicialForm);
        setModoPrecioVenta('manual');
        setPrecioCompraTexto('');
        setPrecioVentaTexto('');
        setPorcentajeGananciaTexto('');
        setModoModal('crear');
        setModalAbierto(true);
    };

    const abrirModalEditar = (producto: Producto) => {
        setFormData({
            id_producto: producto.id_producto,
            id_categoria: producto.id_categoria ?? null,
            id_unidad: producto.id_unidad ?? null,
            codigo_barras: producto.codigo_barras || '',
            nombre: producto.nombre || '',
            precio_compra: producto.precio_compra ?? 0,
            precio_venta: producto.precio_venta ?? 0,
            stock_actual: producto.stock_actual ?? 0,
            stock_minimo: producto.stock_minimo ?? 0,
            estado: producto.estado ?? true,
            imagen: producto.imagen ?? null,
            codigo_impuesto_sri: producto.codigo_impuesto_sri || ''
        });
        setPrecioCompraTexto(String(producto.precio_compra ?? 0));
        setPrecioVentaTexto(String(producto.precio_venta ?? 0));
        setModoPrecioVenta('manual');
        setPorcentajeGananciaTexto('');
        setModoModal('editar');
        setModalAbierto(true);
    };

    const abrirModalVer = (producto: Producto) => {
        abrirModalEditar(producto);
        setModoModal('ver');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData(prev => ({ ...prev, imagen: file }));
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, type, value } = e.target;

        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else if (type === 'number' || name === 'id_categoria' || name === 'id_unidad') {
            setFormData(prev => ({ ...prev, [name]: value === '' ? null : Number(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value === '' ? null : value }));
        }
    };

    const handleCategoriaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const nuevaCategoriaId = e.target.value === '' ? null : Number(e.target.value);
        const categoria = categorias.find(c => c.id_categoria === nuevaCategoriaId);

        setFormData(prev => ({
            ...prev,
            id_categoria: nuevaCategoriaId,
            id_unidad: prev.id_unidad ? prev.id_unidad : (categoria?.id_unidad_sugerida ?? null)
        }));
    };

    const activarModoPorcentaje = () => {
        setModoPrecioVenta('porcentaje');
        if (porcentajeGananciaTexto === '') {
            setPorcentajeGananciaTexto('10');
        }
    };

    const activarModoManual = () => {
        setModoPrecioVenta('manual');
    };

    const limpiarPorcentaje = () => {
        setPorcentajeGananciaTexto('');
        setModoPrecioVenta('manual');
    };

    const handlePrecioCompraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const texto = e.target.value;
        setPrecioCompraTexto(texto);
        setFormData(prev => ({ ...prev, precio_compra: parsearDecimal(texto) }));
    };

    const handlePrecioVentaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const texto = e.target.value;
        setPrecioVentaTexto(texto);
        setFormData(prev => ({ ...prev, precio_venta: parsearDecimal(texto) }));
    };

    const handlePorcentajeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPorcentajeGananciaTexto(e.target.value);
    };

    const handleGuardar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (modoModal === 'ver') return;

        setGuardando(true);
        setError(null);

        try {
            const precioCompraFinal = parsearDecimal(precioCompraTexto);
            const precioVentaFinal = parsearDecimal(precioVentaTexto);

            const data = new FormData();

            if (modoModal === 'editar') {
                data.append('IdProducto', String(formData.id_producto ?? 0));
            }

            data.append('CodigoBarras', formData.codigo_barras ? String(formData.codigo_barras).trim() : '');
            data.append('Nombre', formData.nombre ? String(formData.nombre).trim() : '');
            data.append('PrecioCompra', String(precioCompraFinal));
            data.append('PrecioVenta', String(precioVentaFinal));
            //data.append('StockActual', String(formData.stock_actual ?? 0));
            data.append('StockMinimo', String(formData.stock_minimo ?? 0));
            data.append('Estado', formData.estado ? 'true' : 'false');
            data.append('CodigoImpuestoSri', formData.codigo_impuesto_sri ? String(formData.codigo_impuesto_sri).trim() : '0');

            data.append('IdCategoria', String(formData.id_categoria || ''));
            data.append('IdUnidad', String(formData.id_unidad || ''));

            if (formData.imagen instanceof File) {
                data.append('ImagenArchivo', formData.imagen);
            }

            let respuesta;
            if (modoModal === 'crear') {
                respuesta = await api.post('/Productos/Agregar', data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                data.append('IdProducto', String(formData.id_producto));
                respuesta = await api.put('/Productos/Modificar', data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            if (respuesta.data && respuesta.data.success) {
                alert(modoModal === 'crear' ? 'Producto registrado con éxito' : 'Producto actualizado con éxito');
                setModalAbierto(false);
                await cargarDatosIniciales();
            } else {
                setError(respuesta.data?.mensaje || 'Ocurrió un problema al procesar el producto.');
            }
        } catch (err: any) {
            console.error("Error en handleGuardar:", err);
            const mensajeError = err.response?.data?.mensaje || 'Error de servidor al procesar la solicitud.';
            alert(`❌ Error: ${mensajeError}`);
            setError(mensajeError);
        } finally {
            setGuardando(false);
        }
    };

    const handleEliminar = async (id: number, nombre: string) => {
        const confirmar = window.confirm(`¿Estás seguro de que deseas desactivar el producto "${nombre}"?`);

        if (confirmar) {
            try {
                const respuesta = await api.delete(`/productos/desactivar/${id}`);
                if (respuesta.data.success) {
                    alert('Producto desactivado correctamente.');
                    await cargarDatosIniciales();
                } else {
                    alert(respuesta.data?.mensaje || 'No se pudo desactivar el producto.');
                }
            } catch (err: any) {
                console.error("Error en handleEliminar:", err);
                alert(err.response?.data?.mensaje || 'Error al desactivar el producto');
            }
        }
    };

    const productosFiltrados = productos.filter(producto => {
        const termino = busqueda.toLowerCase();

        const coincideBusqueda =
            (producto.nombre?.toLowerCase() || '').includes(termino) ||
            (producto.codigo_barras?.toLowerCase() || '').includes(termino) ||
            (producto.codigo_impuesto_sri?.toLowerCase() || '').includes(termino);

        const coincideCategoria =
            categoriaActiva === null || producto.id_categoria === categoriaActiva;

        return coincideBusqueda && coincideCategoria;
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

    const productosOrdenados = [...productosFiltrados].sort((a: any, b: any) => {
        let valA = a[columnaOrden];
        let valB = b[columnaOrden];

        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (typeof valA === 'string') {
            return direccionOrden === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return direccionOrden === 'asc' ? valA - valB : valB - valA;
    });

    const productosActuales = productosOrdenados.slice(indicePrimerElemento, indiceUltimoElemento);
    const totalPaginas = Math.ceil(productosFiltrados.length / elementosPorPagina);

    const gananciaCalculada = modoPrecioVenta === 'porcentaje' && porcentajeGanancia !== ''
        ? (parsearDecimal(precioCompraTexto) * porcentajeGanancia / 100)
        : 0;

    return (
        <div className="clientes-wrapper">
            <div className="clientes-header">
                <h1 className="clientes-title">Gestión de Productos </h1>
            </div>

            {error && <div className="error-message" style={{ color: 'red', margin: '10px 0' }}>{error}</div>}

            <div className="clientes-controls">
                <div className="control-box flex-grow">
                    <span className="control-label"> Búsqueda Inteligente</span>
                    <div className="search-input-group">
                        <input
                            type="text"
                            placeholder="Buscar por Nombre, Código de Barras"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                        <button className="btn" type="button"><LuSearch /></button>
                    </div>
                </div>

                <div className="control-box action-box">
                    <span className="control-label">Acción</span>
                    <button className="btn" type="button" onClick={abrirModalCrear}>
                        Nuevo Producto
                    </button>
                </div>
            </div>

            <div className="pos-layout" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div
                    className="pos-categorias"
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        width: '180px',
                        flexShrink: 0,
                        maxHeight: '600px',
                        overflowY: 'auto'
                    }}
                >
                    <button
                        type="button"
                        className={`pos-categoria-btn ${categoriaActiva === null ? "active" : ""}`}
                        onClick={() => setCategoriaActiva(null)}
                        style={{ justifyContent: 'flex-start', width: '100%' }}
                    >
                        <span className="pos-categoria-icon">🌿</span>
                        Todos
                    </button>
                    {categorias.map((cat) => (
                        <button
                            type="button"
                            key={cat.id_categoria}
                            className={`pos-categoria-btn ${categoriaActiva === cat.id_categoria ? "active" : ""}`}
                            onClick={() => setCategoriaActiva(cat.id_categoria)}
                            style={{ justifyContent: 'flex-start', width: '100%' }}
                        >
                            <span className="pos-categoria-icon">
                                {iconosCategorias[cat.nombre] || "📦"}
                            </span>
                            {cat.nombre}
                        </button>
                    ))}
                </div>

                <div className="table-container" style={{ flex: 1, minWidth: 0 }}>
                    {cargando ? (
                        <div className="text-center" style={{ padding: '20px' }}>Cargando productos...</div>
                    ) : (
                        <>
                            <table className="clientes-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                                <colgroup>
                                    <col style={{ width: '55px' }} />
                                    <col style={{ width: '13%' }} />
                                    <col style={{ width: '19%' }} />
                                    <col style={{ width: '9%' }} />
                                    <col style={{ width: '9%' }} />
                                    <col style={{ width: '11%' }} />
                                    <col style={{ width: '7%' }} />
                                    <col style={{ width: '7%' }} />
                                    <col style={{ width: '12%' }} />
                                </colgroup>
                                <thead>
                                    <tr>
                                        <th>Imagen</th>

                                        <th className="th-ordenable" onClick={() => manejarOrden('codigo_barras')} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            Código de Barras
                                            {columnaOrden === 'codigo_barras' && (
                                                direccionOrden === 'asc'
                                                    ? <span style={{ color: '#00e676', fontSize: '18px', fontWeight: 'bold', marginLeft: '6px' }}>🡡</span>
                                                    : <span style={{ color: '#ff1744', fontSize: '18px', fontWeight: 'bold', marginLeft: '6px' }}>🡣</span>
                                            )}
                                        </th>

                                        <th className="th-ordenable" onClick={() => manejarOrden('nombre')} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            Nombre del Producto
                                            {columnaOrden === 'nombre' && (
                                                direccionOrden === 'asc'
                                                    ? <span style={{ color: '#00e676', fontSize: '18px', fontWeight: 'bold', marginLeft: '6px' }}>🡡</span>
                                                    : <span style={{ color: '#ff1744', fontSize: '18px', fontWeight: 'bold', marginLeft: '6px' }}>🡣</span>
                                            )}
                                        </th>

                                        <th className="th-ordenable" onClick={() => manejarOrden('precio_compra')} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            P. Compra
                                            {columnaOrden === 'precio_compra' && (
                                                direccionOrden === 'asc'
                                                    ? <span style={{ color: '#00e676', fontSize: '18px', fontWeight: 'bold', marginLeft: '6px' }}>🡡</span>
                                                    : <span style={{ color: '#ff1744', fontSize: '18px', fontWeight: 'bold', marginLeft: '6px' }}>🡣</span>
                                            )}
                                        </th>

                                        <th className="th-ordenable" onClick={() => manejarOrden('precio_venta')} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            P. Venta
                                            {columnaOrden === 'precio_venta' && (
                                                direccionOrden === 'asc'
                                                    ? <span style={{ color: '#00e676', fontSize: '18px', fontWeight: 'bold', marginLeft: '6px' }}>🡡</span>
                                                    : <span style={{ color: '#ff1744', fontSize: '18px', fontWeight: 'bold', marginLeft: '6px' }}>🡣</span>
                                            )}
                                        </th>

                                        <th title="Precio Compra × Stock Actual — cuánto tienes invertido en este producto hoy" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            Valor Invertido
                                        </th>

                                        <th className="th-ordenable" onClick={() => manejarOrden('stock_actual')} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            Stock
                                            {columnaOrden === 'stock_actual' && (
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
                                    {productosActuales.map((producto) => (
                                        <tr key={producto.id_producto}>
                                            <td>
                                                <div className="client-name-cell">
                                                    {producto.imagen && typeof producto.imagen === 'string' && producto.imagen.trim() !== "" ? (
                                                        <img
                                                            src={
                                                                producto.imagen.startsWith('http')
                                                                    ? producto.imagen
                                                                    : `https://localhost:7145${producto.imagen.startsWith('/') ? '' : '/'}${producto.imagen}`
                                                            }
                                                            alt={producto.nombre}
                                                            className="client-avatar"
                                                            style={{ borderRadius: '6px', objectFit: 'cover', width: '40px', height: '40px' }}
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="client-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e2e8f0', borderRadius: '6px', width: '40px', height: '40px' }}>
                                                            <LuCamera style={{ color: '#a0aec0' }} />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <span className="barcode-badge" style={{ fontFamily: 'monospace', background: '#f7fafc', padding: '4px 8px', borderRadius: '4px', border: '1px solid #edf2f7' }}>
                                                    {producto.codigo_barras}
                                                </span>
                                            </td>
                                            <td><strong>{producto.nombre}</strong></td>
                                            <td>${(producto.precio_compra ?? 0).toFixed(2)}</td>
                                            <td>${(producto.precio_venta ?? 0).toFixed(2)}</td>
                                            <td>
                                                <strong>
                                                    ${((producto.precio_compra ?? 0) * (producto.stock_actual ?? 0)).toFixed(2)}
                                                </strong>
                                            </td>
                                            <td>
                                                <span style={{ fontWeight: 'bold', color: producto.stock_actual <= (producto.stock_minimo ?? 5) ? '#e53e3e' : 'inherit' }}>
                                                    {producto.stock_actual}
                                                </span>
                                            </td>
                                            <td>
                                                <label className="switch">
                                                    <input type="checkbox" checked={!!producto.estado} readOnly />
                                                    <span className="slider round"></span>
                                                </label>
                                            </td>
                                            <td>
                                                <div className="actions-cell">
                                                    <button className="btn-action-text" type="button" onClick={() => abrirModalVer(producto)}>
                                                        Ver
                                                    </button>
                                                    <button className="btn-icon edit" type="button" title="Editar" onClick={() => abrirModalEditar(producto)}>
                                                        <FiEdit />
                                                    </button>
                                                    <button className="btn-icon delete" type="button" title="Desactivar" onClick={() => handleEliminar(producto.id_producto, producto.nombre)}>
                                                        <LuTrash2 />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {productosActuales.length === 0 && (
                                        <tr>
                                            <td colSpan={9} className="text-center" style={{ padding: '20px' }}>
                                                {busqueda === '' && categoriaActiva === null ? 'No hay productos registrados.' : 'No se encontraron resultados.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                            {productosFiltrados.length > 0 && (
                                <div className="pagination-container">
                                    <span className="pagination-info">
                                        Mostrando {indicePrimerElemento + 1} a {Math.min(indiceUltimoElemento, productosFiltrados.length)} de {productosFiltrados.length} registros
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
            </div>

            {modalAbierto && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>
                                {modoModal === 'crear' && 'Registrar Nuevo Producto'}
                                {modoModal === 'editar' && 'Editar Producto'}
                                {modoModal === 'ver' && 'Detalles del Producto'}
                            </h2>
                            <button className="btn-close" type="button" onClick={() => setModalAbierto(false)}>
                                <LuX />
                            </button>
                        </div>
                        <form onSubmit={handleGuardar}>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Código de Barras</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        name="codigo_barras"
                                        required
                                        value={formData.codigo_barras || ''}
                                        onChange={handleChange}
                                        disabled={modoModal === 'ver'}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                console.log("Código escaneado:", formData.codigo_barras);
                                            }
                                        }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Nombre del Producto</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        name="nombre"
                                        required
                                        value={formData.nombre || ''}
                                        onChange={handleChange}
                                        disabled={modoModal === 'ver'}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Categoría</label>
                                    <select
                                        className="form-input"
                                        name="id_categoria"
                                        required
                                        value={formData.id_categoria === null || formData.id_categoria === undefined ? '' : formData.id_categoria}
                                        onChange={handleCategoriaChange}
                                        disabled={modoModal === 'ver'}
                                    >
                                        <option value="">-- Seleccione Categoría --</option>
                                        {categorias.map(cat => (
                                            <option key={cat.id_categoria} value={cat.id_categoria}>
                                                {cat.nombre}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Unidad de Medida</label>
                                    <select
                                        className="form-input"
                                        name="id_unidad"
                                        required
                                        value={formData.id_unidad === null || formData.id_unidad === undefined ? '' : formData.id_unidad}
                                        onChange={handleChange}
                                        disabled={modoModal === 'ver'}
                                    >
                                        <option value="">-- Seleccione Unidad --</option>
                                        {unidades.map(uni => (
                                            <option key={uni.id_unidad} value={uni.id_unidad}>
                                                {uni.nombre}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Precio de Compra ($)</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        className="form-input"
                                        required
                                        value={precioCompraTexto}
                                        onChange={handlePrecioCompraChange}
                                        disabled={modoModal === 'ver'}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Precio de Venta ($)</label>

                                    <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                                        <button
                                            type="button"
                                            onClick={activarModoManual}
                                            disabled={modoModal === 'ver'}
                                            style={{
                                                flex: 1,
                                                padding: '5px 8px',
                                                fontSize: '12px',
                                                borderRadius: '4px',
                                                border: '1px solid #cbd5e0',
                                                background: modoPrecioVenta === 'manual' ? '#16a34a' : '#fff',
                                                color: modoPrecioVenta === 'manual' ? '#fff' : '#333',
                                                cursor: modoModal === 'ver' ? 'default' : 'pointer'
                                            }}
                                        >
                                            Manual
                                        </button>
                                        <button
                                            type="button"
                                            onClick={activarModoPorcentaje}
                                            disabled={modoModal === 'ver'}
                                            style={{
                                                flex: 1,
                                                padding: '5px 8px',
                                                fontSize: '12px',
                                                borderRadius: '4px',
                                                border: '1px solid #cbd5e0',
                                                background: modoPrecioVenta === 'porcentaje' ? '#16a34a' : '#fff',
                                                color: modoPrecioVenta === 'porcentaje' ? '#fff' : '#333',
                                                cursor: modoModal === 'ver' ? 'default' : 'pointer'
                                            }}
                                        >
                                            % sobre Compra
                                        </button>
                                    </div>

                                    {modoPrecioVenta === 'porcentaje' && (
                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                className="form-input"
                                                placeholder="Ej: 10"
                                                value={porcentajeGananciaTexto}
                                                onChange={handlePorcentajeChange}
                                                disabled={modoModal === 'ver'}
                                                style={{ width: '80px' }}
                                            />
                                            <span style={{ fontSize: '13px', color: '#555' }}>%</span>

                                            {[10, 20, 30].map(pct => (
                                                <button
                                                    key={pct}
                                                    type="button"
                                                    onClick={() => setPorcentajeGananciaTexto(String(pct))}
                                                    disabled={modoModal === 'ver'}
                                                    style={{
                                                        padding: '3px 8px',
                                                        fontSize: '11px',
                                                        borderRadius: '12px',
                                                        border: '1px solid #cbd5e0',
                                                        background: porcentajeGanancia === pct ? '#e6ffed' : '#f7fafc',
                                                        cursor: modoModal === 'ver' ? 'default' : 'pointer'
                                                    }}
                                                >
                                                    {pct}%
                                                </button>
                                            ))}

                                            <button
                                                type="button"
                                                title="Limpiar % y volver a modo manual"
                                                onClick={limpiarPorcentaje}
                                                disabled={modoModal === 'ver'}
                                                style={{
                                                    marginLeft: 'auto',
                                                    padding: '4px 6px',
                                                    borderRadius: '4px',
                                                    border: '1px solid #fca5a5',
                                                    background: '#fff',
                                                    color: '#e53e3e',
                                                    cursor: modoModal === 'ver' ? 'default' : 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <LuX size={14} />
                                            </button>
                                        </div>
                                    )}

                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        className="form-input"
                                        required
                                        value={precioVentaTexto}
                                        onChange={handlePrecioVentaChange}
                                        disabled={modoModal === 'ver' || modoPrecioVenta === 'porcentaje'}
                                    />

                                    {modoPrecioVenta === 'porcentaje' && porcentajeGanancia !== '' && (
                                        <small style={{ display: 'block', marginTop: '4px', color: '#16a34a' }}>
                                            {porcentajeGanancia}% de ${parsearDecimal(precioCompraTexto).toFixed(2)} = +${gananciaCalculada.toFixed(2)} → Venta: ${parsearDecimal(precioVentaTexto).toFixed(2)}
                                        </small>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Stock Mínimo</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        name="stock_minimo"
                                        value={formData.stock_minimo === 0 && modoModal === 'crear' ? '' : (formData.stock_minimo ?? '')}
                                        onChange={handleChange}
                                        disabled={modoModal === 'ver'}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Código Impuesto SRI</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        name="codigo_impuesto_sri"
                                        value={formData.codigo_impuesto_sri || ''}
                                        onChange={handleChange}
                                        disabled={modoModal === 'ver'}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Imagen del Producto</label>
                                    <input
                                        type="file"
                                        className="form-input"
                                        name="imagen"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        disabled={modoModal === 'ver'}
                                    />
                                    {formData.imagen && (
                                        <div style={{ marginTop: '10px' }}>
                                            <img
                                                src={
                                                    formData.imagen instanceof File
                                                        ? URL.createObjectURL(formData.imagen)
                                                        : (formData.imagen.startsWith('http') ? formData.imagen : `https://localhost:7145${formData.imagen.startsWith('/') ? '' : '/'}${formData.imagen}`)
                                                }
                                                alt="Vista previa"
                                                style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }}
                                            />
                                        </div>
                                    )}
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
                                        {guardando ? 'Guardando...' : (modoModal === 'crear' ? 'Guardar Producto' : 'Actualizar Cambios')}
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

export default Productos;