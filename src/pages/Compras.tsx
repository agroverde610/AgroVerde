import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LuSearch, LuTrash2, LuClipboardList } from 'react-icons/lu';
import {
    registrarCompra,
    agregarDetalleCompra,
    recibirLote,
    finalizarCompra
} from '../services/api';
import api from '../services/api';
import '../App.css';
import SelectorCantidadPeso from '../components/SelectorCantidadPeso';
import { categoriaVendePorPeso } from '../utils/unidadesConversion';

interface Proveedor {
    ProveedorId: number;
    RazonSocial: string;
}

interface Categoria {
    idCategoria: number;
    nombre: string;
}

interface Unidad {
    idUnidad: number;
    nombre: string;
    abreviatura: string;
    permiteDecimales: boolean;
}

interface Producto {
    idProducto: number;
    nombre: string;
    precioCompra: number;
    precioVenta: number;
    stockActual: number;
    idCategoria: number;
    categoria: string;
    permiteDecimales?: boolean;
    codigoBarras?: string;
}

interface LineaDetalle {
    compraDetalleId: number;
    productoId: number;
    nombreProducto: string;
    cantidad: number;
    costoUnitario: number;
    recibido: boolean;
    permiteDecimales: boolean;
}

const iconosCategorias: Record<string, string> = {
    default: '🌿'
};

// Convierte texto escrito por el usuario a número, aceptando tanto coma
// como punto como separador decimal (Chrome en español fuerza la coma
// en los inputs type="number", así que usamos type="text" + este parser
// para que funcione sin importar la configuración regional del navegador).
const parsearDecimal = (texto: string): number => {
    const normalizado = texto.replace(',', '.');
    const valor = parseFloat(normalizado);
    return isNaN(valor) ? 0 : valor;
};

export default function Compras() {
    const [searchParams] = useSearchParams();

    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [unidades, setUnidades] = useState<Unidad[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [categoriaActiva, setCategoriaActiva] = useState<number | null>(null);
    const [busqueda, setBusqueda] = useState('');
    const [buscandoCodigo, setBuscandoCodigo] = useState(false);

    const [proveedorId, setProveedorId] = useState<number>(0);
    const [numeroFactura, setNumeroFactura] = useState('');
    const [compraId, setCompraId] = useState<number | null>(null);
    const [lineas, setLineas] = useState<LineaDetalle[]>([]);

    const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
    const [cantidad, setCantidad] = useState<number>(1);
    // Guardamos el texto tal cual lo escribe el usuario (sin reformatear en cada
    // tecla) — el número real se calcula aparte, solo cuando se necesita, para no
    // borrar la coma/punto mientras todavía está escribiendo.
    const [costoUnitarioTexto, setCostoUnitarioTexto] = useState<string>('0');
    const costoUnitario = parsearDecimal(costoUnitarioTexto);

    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');

    // Modal de nuevo producto
    const [modalProductoAbierto, setModalProductoAbierto] = useState(false);
    const [guardandoProducto, setGuardandoProducto] = useState(false);
    const [errorProducto, setErrorProducto] = useState('');
    // Solo se usa para calcular el Precio Venta sugerido, no se manda al backend.
    // Mismo patrón: texto libre mientras se escribe, número derivado solo cuando se necesita.
    const [precioCompraTexto, setPrecioCompraTexto] = useState<string>('0');
    const [precioVentaTexto, setPrecioVentaTexto] = useState<string>('0');
    const [porcentajeGananciaTexto, setPorcentajeGananciaTexto] = useState<string>('');
    // Igual que en Lista de Productos: 'manual' (escribes el precio) o 'porcentaje'
    // (escribes el % y el Precio Venta se calcula solo sobre el Precio Compra).
    const [modoPrecioVentaNuevo, setModoPrecioVentaNuevo] = useState<'manual' | 'porcentaje'>('manual');
    const porcentajeGanancia = parsearDecimal(porcentajeGananciaTexto || '0');
    const [formProducto, setFormProducto] = useState({
        idCategoria: 0,
        idUnidad: 0,
        codigoBarras: '',
        nombre: '',
        precioCompra: 0,
        precioVenta: 0,
        codigoImpuestoSri: '',
        stockActual: 0,
        stockMinimo: 0,
        estado: true
    });

    useEffect(() => {
        api.get('/Proveedores/Obtener?solo_activos=true').then(res => setProveedores(res.data.data ?? []));
        api.get('Ventas/Categorias').then(res => {
            if (res.data && res.data.success) setCategorias(res.data.data);
            else if (Array.isArray(res.data)) setCategorias(res.data);
        });
        api.get('/Productos/ListarUnidades').then(res => {
            if (res.data && res.data.success) setUnidades(res.data.data);
            else if (Array.isArray(res.data)) setUnidades(res.data);
        });

        const continuarId = searchParams.get('continuar');
        if (continuarId) {
            cargarCompraExistente(Number(continuarId));
        }
    }, []);

    const cargarProductos = () => {
        const url = categoriaActiva
            ? `/Compras/productos?idCategoria=${categoriaActiva}`
            : '/Compras/productos';
        api.get(url).then(res => setProductos(res.data.data ?? []));
    };

    useEffect(() => {
        cargarProductos();
    }, [categoriaActiva]);

    const cargarCompraExistente = async (id: number) => {
        setError('');
        try {
            const res = await api.get(`/Compras/${id}/detalle`);
            if (res.data.success) {
                setCompraId(id);
                const lineasCargadas = res.data.data.map((d: any) => ({
                    compraDetalleId: d.compraDetalleId,
                    productoId: 0,
                    nombreProducto: d.producto,
                    cantidad: d.cantidad,
                    costoUnitario: d.costoUnitario,
                    recibido: d.recibido,
                    permiteDecimales: true
                }));
                setLineas(lineasCargadas);
                setMensaje(`Retomando compra #${id}. Recibe los productos pendientes.`);
            } else {
                setError('No se pudo cargar la compra pendiente.');
            }
        } catch (err: any) {
            setError(err.response?.data?.mensaje ?? 'Error al cargar la compra pendiente.');
        }
    };

    const productosFiltrados = productos.filter((p) =>
        (p.nombre ?? '').toLowerCase().includes(busqueda.toLowerCase())
    );

    const iniciarCompra = async () => {
        setError('');
        if (!proveedorId || !numeroFactura) {
            setError('Selecciona un proveedor y escribe el número de factura.');
            return;
        }
        try {
            const usuarioId = Number(localStorage.getItem('idUsuario')) || 1;
            const res = await registrarCompra({
                proveedorId,
                numeroFactura,
                usuarioId,
                observaciones: ''
            });
            if (res.success) {
                setCompraId(res.data.compraId);
                setMensaje(`Compra #${res.data.compraId} iniciada. Selecciona productos para agregar.`);
            } else {
                setError(res.mensaje);
            }
        } catch (err: any) {
            setError(err.response?.data?.mensaje ?? 'Error al iniciar la compra.');
        }
    };

    const seleccionarProducto = (producto: Producto) => {
        setProductoSeleccionado(producto);
        setCantidad(1);
        setCostoUnitarioTexto(String(producto.precioCompra || 0));
    };

    const abrirModalNuevoProducto = () => {
        setErrorProducto('');
        setPorcentajeGananciaTexto('');
        setPrecioCompraTexto('0');
        setPrecioVentaTexto('0');
        setModoPrecioVentaNuevo('manual');
        setFormProducto({
            idCategoria: categoriaActiva ?? 0,
            idUnidad: 0,
            codigoBarras: '',
            nombre: busqueda,
            precioCompra: 0,
            precioVenta: 0,
            codigoImpuestoSri: '',
            stockActual: 0,
            stockMinimo: 0,
            estado: true
        });
        setModalProductoAbierto(true);
    };

    const guardarNuevoProducto = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorProducto('');

        if (!formProducto.nombre.trim() || !formProducto.codigoBarras.trim()) {
            setErrorProducto('El nombre y el código de barras son obligatorios.');
            return;
        }
        if (!formProducto.idCategoria || !formProducto.idUnidad) {
            setErrorProducto('Selecciona categoría y unidad.');
            return;
        }

        const precioCompraFinal = parsearDecimal(precioCompraTexto);
        const precioVentaFinal = parsearDecimal(precioVentaTexto);

        setGuardandoProducto(true);
        try {
            const data = new FormData();
            data.append('IdCategoria', String(formProducto.idCategoria));
            data.append('IdUnidad', String(formProducto.idUnidad));
            data.append('CodigoBarras', formProducto.codigoBarras);
            data.append('Nombre', formProducto.nombre);
            data.append('PrecioCompra', String(precioCompraFinal));
            data.append('PrecioVenta', String(precioVentaFinal));
            data.append('CodigoImpuestoSri', formProducto.codigoImpuestoSri);
            data.append('StockActual', String(formProducto.stockActual));
            data.append('StockMinimo', String(formProducto.stockMinimo));
            data.append('Estado', String(formProducto.estado));

            const respuesta = await api.post('/Productos/Agregar', data);

            if (respuesta.data.success) {
                setModalProductoAbierto(false);
                setMensaje(`Producto "${formProducto.nombre}" creado correctamente.`);

                const nuevoProducto: Producto = {
                    idProducto: respuesta.data.idProducto,
                    nombre: formProducto.nombre,
                    precioCompra: precioCompraFinal,
                    precioVenta: precioVentaFinal,
                    stockActual: 0,
                    idCategoria: formProducto.idCategoria,
                    categoria: categorias.find(c => c.idCategoria === formProducto.idCategoria)?.nombre ?? '',
                    permiteDecimales: unidades.find(u => u.idUnidad === formProducto.idUnidad)?.permiteDecimales ?? true,
                    codigoBarras: formProducto.codigoBarras
                };

                setProductos(prev => [nuevoProducto, ...prev]);
                seleccionarProducto(nuevoProducto);
                setBusqueda('');
            } else {
                setErrorProducto(respuesta.data.mensaje ?? 'No se pudo crear el producto.');
            }
        } catch (err: any) {
            setErrorProducto(err.response?.data?.mensaje ?? 'Error al crear el producto.');
        } finally {
            setGuardandoProducto(false);
        }
    };

    const agregarLinea = async () => {
        setError('');
        if (!compraId || !productoSeleccionado || cantidad <= 0 || costoUnitario <= 0) {
            setError('Completa cantidad y costo antes de agregar.');
            return;
        }
        try {
            const res = await agregarDetalleCompra({
                compraId,
                productoId: productoSeleccionado.idProducto,
                cantidad,
                costoUnitario
            });
            if (res.success) {
                setLineas([...lineas, {
                    compraDetalleId: res.data?.compraDetalleId ?? 0,
                    productoId: productoSeleccionado.idProducto,
                    nombreProducto: productoSeleccionado.nombre,
                    cantidad,
                    costoUnitario,
                    recibido: false,
                    permiteDecimales: productoSeleccionado.permiteDecimales ?? true
                }]);

                setMensaje(`"${productoSeleccionado.nombre}" agregado a la compra.`);
                setProductoSeleccionado(null);
                setCantidad(1);
                setCostoUnitarioTexto('0');
            } else {
                setError(res.mensaje);
            }
        } catch (err: any) {
            setError(err.response?.data?.mensaje ?? 'Error al agregar el producto.');
        }
    };

    const marcarRecibido = async (index: number, codigoLote: string, fechaVencimiento: string) => {
        const linea = lineas[index];
        try {
            const res = await recibirLote({
                compraDetalleId: linea.compraDetalleId,
                codigoLote,
                fechaVencimiento,
                cantidadRecibida: linea.cantidad
            });
            if (res.success) {
                const nuevasLineas = [...lineas];
                nuevasLineas[index].recibido = true;
                setLineas(nuevasLineas);

                // El backend ya sincronizó stock_actual y precio_compra del producto
                // al recibir el lote (sp_Compras_RecibirLote). Refrescamos el catálogo
                // en memoria para que se vea actualizado sin recargar la página.
                cargarProductos();
            } else {
                setError(res.mensaje);
            }
        } catch (err: any) {
            setError(err.response?.data?.mensaje ?? 'Error al recibir el lote.');
        }
    };

    const eliminarLinea = (index: number) => {
        setLineas(lineas.filter((_, i) => i !== index));
    };

    const finalizar = async () => {
        if (!compraId) return;
        const res = await finalizarCompra(compraId);
        if (res.success) {
            setMensaje('Compra finalizada correctamente.');
            setCompraId(null);
            setLineas([]);
            setNumeroFactura('');
            setProveedorId(0);
        } else {
            setError(res.mensaje);
        }
    };

    const totalCompra = lineas.reduce((s, l) => s + l.cantidad * l.costoUnitario, 0);

    // Busca un producto por código de barras: primero en los ya cargados en pantalla
    // (rápido), y si no aparece ahí (ej. porque hay un filtro de categoría activo y
    // el producto es de otra), hace un fallback al backend antes de asumir que no existe.
    // Esto evita crear productos duplicados por error.
    const handleScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();

        const codigoLimpio = busqueda.trim();
        if (!codigoLimpio) return;

        const productoEnMemoria = productos.find(p => p.codigoBarras === codigoLimpio);
        if (productoEnMemoria) {
            seleccionarProducto(productoEnMemoria);
            setBusqueda('');
            setError('');
            return;
        }

        setBuscandoCodigo(true);
        setError('');
        try {
            const res = await api.get(`/Productos/BuscarPorCodigoBarras/${encodeURIComponent(codigoLimpio)}`);
            if (res.data.success && res.data.data) {
                const p = res.data.data;
                const productoEncontrado: Producto = {
                    idProducto: p.idProducto,
                    nombre: p.nombre,
                    precioCompra: p.precioCompra,
                    precioVenta: p.precioVenta,
                    stockActual: p.stockActual,
                    idCategoria: p.idCategoria,
                    categoria: categorias.find(c => c.idCategoria === p.idCategoria)?.nombre ?? '',
                    permiteDecimales: unidades.find(u => u.idUnidad === p.idUnidad)?.permiteDecimales ?? true,
                    codigoBarras: p.codigoBarras
                };
                setProductos(prev => [productoEncontrado, ...prev.filter(x => x.idProducto !== productoEncontrado.idProducto)]);
                seleccionarProducto(productoEncontrado);
                setBusqueda('');
            } else {
                setError(`Producto no encontrado. Registrando nuevo código: ${codigoLimpio}`);
                abrirModalNuevoProductoEscaneado(codigoLimpio);
            }
        } catch {
            setError(`Producto no encontrado. Registrando nuevo código: ${codigoLimpio}`);
            abrirModalNuevoProductoEscaneado(codigoLimpio);
        } finally {
            setBuscandoCodigo(false);
        }
    };

    const abrirModalNuevoProductoEscaneado = (codigo: string) => {
        setErrorProducto('');
        setPorcentajeGananciaTexto('');
        setPrecioCompraTexto('0');
        setPrecioVentaTexto('0');
        setModoPrecioVentaNuevo('manual');
        setFormProducto({
            idCategoria: categoriaActiva ?? 0,
            idUnidad: 0,
            codigoBarras: codigo,
            nombre: '',
            precioCompra: 0,
            precioVenta: 0,
            codigoImpuestoSri: '',
            stockActual: 0,
            stockMinimo: 0,
            estado: true
        });
        setModalProductoAbierto(true);
    };

    return (
        <div className="pos-wrapper">
            {/* Categorías */}
            <div className="pos-categorias">
                <button
                    className={`pos-categoria-btn ${categoriaActiva === null ? 'active' : ''}`}
                    onClick={() => setCategoriaActiva(null)}
                >
                    <span className="pos-categoria-icon">🌿</span>
                    Todos
                </button>
                {categorias.map((cat) => (
                    <button
                        key={cat.idCategoria}
                        className={`pos-categoria-btn ${categoriaActiva === cat.idCategoria ? 'active' : ''}`}
                        onClick={() => setCategoriaActiva(cat.idCategoria)}
                    >
                        <span className="pos-categoria-icon">
                            {iconosCategorias[cat.nombre] || '📦'}
                        </span>
                        {cat.nombre}
                    </button>
                ))}
            </div>

            {/* Panel de Productos */}
            <div className="pos-productos-panel">
                <div className="pos-header">
                    <h2 className="pos-title">Registrar Compra</h2>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div className="pos-search">
                            <LuSearch className="pos-search-icon" />
                            <input
                                type="text"
                                autoFocus
                                placeholder={buscandoCodigo ? 'Buscando...' : 'Escanee código o busque...'}
                                value={busqueda}
                                disabled={buscandoCodigo}
                                onChange={(e) => setBusqueda(e.target.value)}
                                onKeyDown={handleScan}
                            />
                        </div>
                        {compraId && (
                            <button className="btn" onClick={abrirModalNuevoProducto} style={{ whiteSpace: 'nowrap' }}>
                                + Nuevo producto
                            </button>
                        )}
                    </div>
                </div>

                <p className="pos-subtitulo">
                    {categoriaActiva
                        ? categorias.find(c => c.idCategoria === categoriaActiva)?.nombre || 'Categoría Seleccionada'
                        : 'Todos los productos'}
                </p>

                {!compraId ? (
                    <p className="pos-empty">Inicia una compra (proveedor + factura) para poder agregar productos.</p>
                ) : productosFiltrados.length === 0 ? (
                    <div className="pos-empty" style={{ textAlign: 'center' }}>
                        <p>No hay productos disponibles con ese criterio.</p>
                        <button className="btn" onClick={abrirModalNuevoProducto} style={{ marginTop: 8 }}>
                            + Agregar "{busqueda || 'nuevo producto'}"
                        </button>
                    </div>
                ) : (
                    <div className="pos-grid">
                        {productosFiltrados.map((producto) => {
                            const seleccionado = productoSeleccionado?.idProducto === producto.idProducto;
                            return (
                                <div
                                    key={producto.idProducto}
                                    className="pos-producto-card"
                                    onClick={() => seleccionarProducto(producto)}
                                    style={{
                                        cursor: 'pointer',
                                        borderColor: seleccionado ? '#115e59' : undefined,
                                        boxShadow: seleccionado ? '0 4px 12px rgba(0,0,0,0.08)' : undefined
                                    }}
                                >
                                    <div className="pos-producto-img">📦</div>
                                    <span className="pos-producto-nombre">{producto.nombre}</span>
                                    <span className="pos-producto-precio">
                                        Costo: ${Number(producto.precioCompra ?? 0).toFixed(2)}
                                    </span>
                                    <span className="pos-producto-stock">Stock actual: {producto.stockActual}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Panel derecho: datos de compra / detalle */}
            <div className="pos-ticket">
                <h3 className="pos-ticket-title">
                    <LuClipboardList style={{ marginRight: 8 }} />
                    {compraId ? `Compra #${compraId}` : 'Nueva Compra'}
                </h3>

                {error && <div className="error-message" style={{ marginBottom: 10, fontSize: 14 }}>{error}</div>}
                {mensaje && <div className="success-message" style={{ marginBottom: 10, fontSize: 13 }}>{mensaje}</div>}

                {!compraId ? (
                    <>
                        <div className="form-group">
                            <label className="form-label">Proveedor</label>
                            <select
                                className="form-input"
                                value={proveedorId}
                                onChange={e => setProveedorId(Number(e.target.value))}
                            >
                                <option value={0}>Selecciona un proveedor</option>
                                {proveedores.map(p => (
                                    <option key={p.ProveedorId} value={p.ProveedorId}>{p.RazonSocial}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Número de Factura</label>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <input
                                    className="form-input"
                                    type="text"
                                    value={numeroFactura}
                                    onChange={e => setNumeroFactura(e.target.value)}
                                    placeholder="Ej: 001-001-000000123"
                                />
                                <button
                                    type="button"
                                    className="btn-action-text"
                                    style={{ whiteSpace: 'nowrap' }}
                                    title="Genera un número al azar con el formato que exige el SRI, para compras sin factura del proveedor"
                                    onClick={async () => {
                                        try {
                                            const res = await api.get('/Compras/NumeroFacturaSugerido');
                                            if (res.data.success) setNumeroFactura(res.data.data.numeroFactura);
                                        } catch {
                                            setError('No se pudo generar el número de factura.');
                                        }
                                    }}
                                >
                                    No tengo factura
                                </button>
                            </div>
                        </div>

                        <button className="pos-btn-pagar" onClick={iniciarCompra}>
                            Iniciar Compra
                        </button>
                    </>
                ) : (
                    <>
                        {productoSeleccionado && (
                            <div style={{ background: '#f3f4f6', borderRadius: 8, padding: 10, marginBottom: 12 }}>
                                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                                    {productoSeleccionado.nombre}
                                </p>
                                <div className="flex-row" style={{ gap: 8, marginBottom: 8 }}>
                                    <div style={{ flex: 1 }}>
                                        <label className="form-label" style={{ fontSize: 11 }}>Cantidad</label>
                                        {categoriaVendePorPeso(productoSeleccionado.idCategoria) ? (
                                            <SelectorCantidadPeso
                                                valorInicialUnidadesDeStock={cantidad}
                                                onCambiar={(cantidad) => setCantidad(cantidad)}
                                            />
                                        ) : (
                                            <input
                                                type="number"
                                                className="form-input"
                                                min="1"
                                                step="1"
                                                value={cantidad}
                                                onChange={e => {
                                                    const val = Math.round(parseFloat(e.target.value));
                                                    setCantidad(isNaN(val) ? 0 : val);
                                                }}
                                            />
                                        )}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label className="form-label" style={{ fontSize: 11 }}>Costo Unit.</label>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            className="form-input"
                                            value={costoUnitarioTexto}
                                            onChange={e => setCostoUnitarioTexto(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="flex-row" style={{ gap: 8 }}>
                                    <button className="btn btn-guardar" style={{ flex: 1 }} onClick={agregarLinea}>
                                        Agregar
                                    </button>
                                    <button className="btn-cancelar" onClick={() => setProductoSeleccionado(null)}>
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="pos-ticket-items-header">
                            <span>Producto</span>
                            <span>Cant.</span>
                            <span>Total</span>
                        </div>

                        <div className="pos-ticket-items">
                            {lineas.length === 0 ? (
                                <p className="pos-empty">Selecciona productos del catálogo para agregarlos aquí</p>
                            ) : (
                                lineas.map((linea, i) => (
                                    <div key={i} style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 8, marginBottom: 8 }}>
                                        <div className="pos-ticket-item">
                                            <div className="pos-ticket-item-nombre">
                                                {linea.nombreProducto}
                                                <div style={{ fontSize: 11, color: '#9ca3af' }}>
                                                    ${linea.costoUnitario.toFixed(2)} c/u
                                                </div>
                                            </div>
                                            <div style={{ fontSize: 13 }}>{linea.cantidad}</div>
                                            <div className="pos-ticket-item-subtotal">
                                                ${(linea.cantidad * linea.costoUnitario).toFixed(2)}
                                            </div>
                                        </div>

                                        <div style={{ marginTop: 6 }}>
                                            {linea.recibido ? (
                                                <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
                                                    ✅ Lote recibido
                                                </span>
                                            ) : (
                                                <FilaRecepcion
                                                    onRecibir={(codigo, fecha) => marcarRecibido(i, codigo, fecha)}
                                                    onEliminar={() => eliminarLinea(i)}
                                                />
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="pos-ticket-totales">
                            <div className="pos-ticket-total">
                                <span>Total Compra</span>
                                <span>${totalCompra.toFixed(2)}</span>
                            </div>
                        </div>

                        <button
                            className="pos-btn-pagar"
                            onClick={finalizar}
                            disabled={lineas.length === 0 || lineas.some(l => !l.recibido)}
                        >
                            Finalizar Compra
                        </button>
                    </>
                )}
            </div>

            {/* Modal de nuevo producto */}
            {modalProductoAbierto && (
                <div className="modal-overlay" onClick={() => setModalProductoAbierto(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Agregar Nuevo Producto</h2>
                            <button className="btn-close" onClick={() => setModalProductoAbierto(false)}>✕</button>
                        </div>

                        {errorProducto && <div className="error-message" style={{ marginBottom: 10 }}>{errorProducto}</div>}

                        <form onSubmit={guardarNuevoProducto}>
                            <div className="form-grid">
                                <div className="form-group full-width">
                                    <label className="form-label">Nombre</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        required
                                        value={formProducto.nombre}
                                        onChange={e => setFormProducto({ ...formProducto, nombre: e.target.value })}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Código de Barras</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        required
                                        value={formProducto.codigoBarras}
                                        onChange={e => setFormProducto({ ...formProducto, codigoBarras: e.target.value })}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Categoría</label>
                                    <select
                                        className="form-input"
                                        required
                                        value={formProducto.idCategoria}
                                        onChange={e => setFormProducto({ ...formProducto, idCategoria: Number(e.target.value) })}
                                    >
                                        <option value={0}>Selecciona una categoría</option>
                                        {categorias.map(c => (
                                            <option key={c.idCategoria} value={c.idCategoria}>{c.nombre}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Unidad</label>
                                    <select
                                        className="form-input"
                                        required
                                        value={formProducto.idUnidad}
                                        onChange={e => setFormProducto({ ...formProducto, idUnidad: Number(e.target.value) })}
                                    >
                                        <option value={0}>Selecciona una unidad</option>
                                        {unidades.map(u => (
                                            <option key={u.idUnidad} value={u.idUnidad}>{u.nombre} ({u.abreviatura})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Precio Compra</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        className="form-input"
                                        required
                                        value={precioCompraTexto}
                                        onChange={e => {
                                            const texto = e.target.value;
                                            setPrecioCompraTexto(texto);
                                            if (modoPrecioVentaNuevo === 'porcentaje') {
                                                const nuevoCompra = parsearDecimal(texto);
                                                const nuevoVenta = Math.round(nuevoCompra * (1 + porcentajeGanancia / 100) * 100) / 100;
                                                setPrecioVentaTexto(String(nuevoVenta));
                                            }
                                        }}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Precio de Venta</label>

                                    {/* Selector de modo, igual que en Lista de Productos */}
                                    <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setModoPrecioVentaNuevo('manual')}
                                            style={{
                                                flex: 1, padding: '5px 8px', fontSize: '12px', borderRadius: '4px',
                                                border: '1px solid #cbd5e0', cursor: 'pointer',
                                                background: modoPrecioVentaNuevo === 'manual' ? '#16a34a' : '#fff',
                                                color: modoPrecioVentaNuevo === 'manual' ? '#fff' : '#333'
                                            }}
                                        >
                                            Manual
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setModoPrecioVentaNuevo('porcentaje');
                                                if (!porcentajeGananciaTexto) setPorcentajeGananciaTexto('10');
                                            }}
                                            style={{
                                                flex: 1, padding: '5px 8px', fontSize: '12px', borderRadius: '4px',
                                                border: '1px solid #cbd5e0', cursor: 'pointer',
                                                background: modoPrecioVentaNuevo === 'porcentaje' ? '#16a34a' : '#fff',
                                                color: modoPrecioVentaNuevo === 'porcentaje' ? '#fff' : '#333'
                                            }}
                                        >
                                            % sobre Compra
                                        </button>
                                    </div>

                                    {modoPrecioVentaNuevo === 'porcentaje' && (
                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                className="form-input"
                                                placeholder="Ej: 10"
                                                value={porcentajeGananciaTexto}
                                                onChange={e => {
                                                    const texto = e.target.value;
                                                    setPorcentajeGananciaTexto(texto);
                                                    const porcentaje = parsearDecimal(texto);
                                                    const compra = parsearDecimal(precioCompraTexto);
                                                    const nuevoVenta = Math.round(compra * (1 + porcentaje / 100) * 100) / 100;
                                                    setPrecioVentaTexto(String(nuevoVenta));
                                                }}
                                                style={{ width: '80px' }}
                                            />
                                            <span style={{ fontSize: '13px', color: '#555' }}>%</span>

                                            {[10, 20, 30].map(pct => (
                                                <button
                                                    key={pct}
                                                    type="button"
                                                    onClick={() => {
                                                        setPorcentajeGananciaTexto(String(pct));
                                                        const compra = parsearDecimal(precioCompraTexto);
                                                        const nuevoVenta = Math.round(compra * (1 + pct / 100) * 100) / 100;
                                                        setPrecioVentaTexto(String(nuevoVenta));
                                                    }}
                                                    style={{
                                                        padding: '3px 8px', fontSize: '11px', borderRadius: '12px',
                                                        border: '1px solid #cbd5e0', cursor: 'pointer',
                                                        background: porcentajeGanancia === pct ? '#e6ffed' : '#f7fafc'
                                                    }}
                                                >
                                                    {pct}%
                                                </button>
                                            ))}

                                            <button
                                                type="button"
                                                title="Limpiar % y volver a modo manual"
                                                onClick={() => {
                                                    setPorcentajeGananciaTexto('');
                                                    setModoPrecioVentaNuevo('manual');
                                                }}
                                                style={{
                                                    marginLeft: 'auto', padding: '4px 6px', borderRadius: '4px',
                                                    border: '1px solid #fca5a5', background: '#fff', color: '#e53e3e', cursor: 'pointer'
                                                }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    )}

                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        className="form-input"
                                        required
                                        value={precioVentaTexto}
                                        onChange={e => setPrecioVentaTexto(e.target.value)}
                                        disabled={modoPrecioVentaNuevo === 'porcentaje'}
                                    />

                                    {modoPrecioVentaNuevo === 'porcentaje' && porcentajeGanancia > 0 && (
                                        <small style={{ display: 'block', marginTop: 4, color: '#16a34a' }}>
                                            {porcentajeGanancia}% de ${parsearDecimal(precioCompraTexto).toFixed(2)} → Venta: ${parsearDecimal(precioVentaTexto).toFixed(2)}
                                        </small>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Stock Mínimo</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        min="0"
                                        value={formProducto.stockMinimo}
                                        onChange={e => setFormProducto({ ...formProducto, stockMinimo: Number(e.target.value) })}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Código Impuesto SRI (opcional)</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Ej: 0, 2, 3"
                                        value={formProducto.codigoImpuestoSri}
                                        onChange={e => setFormProducto({ ...formProducto, codigoImpuestoSri: e.target.value })}
                                    />
                                </div>
                            </div>

                            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
                                El stock se registrará en 0 — se completará al "Recibir Lote" en esta misma compra.
                            </p>

                            <div className="modal-footer">
                                <button type="button" className="btn-cancelar" onClick={() => setModalProductoAbierto(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-guardar" disabled={guardandoProducto}>
                                    {guardandoProducto ? 'Guardando...' : 'Guardar Producto'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function FilaRecepcion({ onRecibir, onEliminar }: {
    onRecibir: (codigoLote: string, fechaVencimiento: string) => void;
    onEliminar: () => void;
}) {
    const [codigoLote, setCodigoLote] = useState('');
    const [cargando, setCargando] = useState(true);
    const [errorCodigo, setErrorCodigo] = useState(false);
    const [fechaVencimiento, setFechaVencimiento] = useState('');

    useEffect(() => {
        let cancelado = false;

        const pedirCodigo = async () => {
            setCargando(true);
            setErrorCodigo(false);
            try {
                const res = await api.get('/Compras/CodigoLoteSugerido');
                if (!cancelado) {
                    if (res.data.success) {
                        setCodigoLote(res.data.data.codigoLote);
                    } else {
                        setErrorCodigo(true);
                    }
                }
            } catch {
                if (!cancelado) setErrorCodigo(true);
            } finally {
                if (!cancelado) setCargando(false);
            }
        };

        pedirCodigo();
        return () => { cancelado = true; };
    }, []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {errorCodigo ? (
                <div style={{ fontSize: 12, color: '#dc2626' }}>
                    No se pudo generar el código de lote.{' '}
                    <button
                        className="btn-action-text"
                        style={{ padding: 0, fontSize: 12 }}
                        onClick={() => {
                            setErrorCodigo(false);
                            setCargando(true);
                            api.get('/Compras/CodigoLoteSugerido')
                                .then(res => {
                                    if (res.data.success) setCodigoLote(res.data.data.codigoLote);
                                    else setErrorCodigo(true);
                                })
                                .catch(() => setErrorCodigo(true))
                                .finally(() => setCargando(false));
                        }}
                    >
                        Reintentar
                    </button>
                </div>
            ) : (
                <div
                    style={{
                        fontSize: 12,
                        padding: '5px 8px',
                        borderRadius: 6,
                        background: '#f1f5f4',
                        color: '#374151',
                        border: '1px solid #e5e7eb',
                    }}
                    title="Código de lote generado automáticamente"
                >
                    {cargando ? 'Generando código...' : <>Lote: <strong>{codigoLote}</strong></>}
                </div>
            )}
            <input
                className="form-input"
                type="date"
                value={fechaVencimiento}
                onChange={e => setFechaVencimiento(e.target.value)}
                style={{ fontSize: 12, padding: '5px 8px' }}
            />
            <div className="flex-row" style={{ gap: 6 }}>
                <button
                    className="btn-action-text"
                    style={{ flex: 1 }}
                    onClick={() => onRecibir(codigoLote, fechaVencimiento)}
                    disabled={!codigoLote || !fechaVencimiento || cargando}
                >
                    Recibir Lote
                </button>
                <button
                    className="btn-icon delete"
                    title="Quitar de la compra"
                    onClick={onEliminar}
                >
                    <LuTrash2 size={14} />
                </button>
            </div>
        </div>
    );
}