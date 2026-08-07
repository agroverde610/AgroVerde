import { useState, useEffect } from "react";
import { LuSearch, LuTrash2, LuShoppingCart, LuFileText, LuUserPlus, LuCamera } from "react-icons/lu";
import api from "../services/api";
import type { Categoria, Producto, ItemTicket, Cliente } from "../interfaces/ventas";
import type { UsuarioLogueado } from "../interfaces/auth";
import ReciboVenta from '../components/ReciboVenta';
import CotizacionPDF from '../components/CotizacionPDF';
import SelectorCantidadPeso from '../components/SelectorCantidadPeso';
import CameraScanner from '../components/CameraScanner';
import { useBarcodeScanner } from '../hooks/Usebarcodescanner';
import { categoriaVendePorPeso } from '../utils/unidadesConversion';
import "../App.css";

const iconosCategorias: Record<string, string> = {
    default: "🌿"
};

const Ventas: React.FC = () => {
    const usuarioGuardado = localStorage.getItem("usuario");
    const usuario: UsuarioLogueado | null = usuarioGuardado ? JSON.parse(usuarioGuardado) : null;

    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [categoriaActiva, setCategoriaActiva] = useState<number | null>(null);
    const [busqueda, setBusqueda] = useState("");
    const [ticket, setTicket] = useState<ItemTicket[]>([]);
    const [formaPago, setFormaPago] = useState("EFECTIVO");
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [clienteBusqueda, setClienteBusqueda] = useState("");
    const [clienteResultados, setClienteResultados] = useState<Cliente[]>([]);
    const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
    const [mostrarDropdown, setMostrarDropdown] = useState(false);
    const [reciboData, setReciboData] = useState<any>(null);

    // Modo: Venta normal, o Cotización (mismo POS, distinto flujo al final)
    const [modoOperacion, setModoOperacion] = useState<'venta' | 'cotizacion'>('venta');
    // Solo aplica en modo cotización: permite cotizar para alguien sin cuenta de cliente.
    const [modoCliente, setModoCliente] = useState<'registrado' | 'prospecto'>('registrado');
    const [nombreProspecto, setNombreProspecto] = useState('');
    const [telefonoProspecto, setTelefonoProspecto] = useState('');
    const [cotizacionPdfData, setCotizacionPdfData] = useState<any>(null);

    // Escáner de código de barras (lector USB + cámara)
    const [modoCamara, setModoCamara] = useState(false);
    const [mensajeScan, setMensajeScan] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

    // Descuento manual que el vendedor decide aplicar en esta venta puntual
    // (no se guarda en el cliente, solo aplica a este ticket). Si un producto
    // ya tiene promoción, gana el que dé el precio más bajo, nunca se suman.
    const [descuentoManual, setDescuentoManual] = useState<number>(0);
    // Cómo se aplica el % manual: por cada producto (compite contra su promoción,
    // gana el menor precio) o como una línea de descuento global sobre el total.
    const [modoDescuentoManual, setModoDescuentoManual] = useState<'producto' | 'total'>('producto');

    // Historial de cotizaciones (dentro del mismo modo Cotización)
    const [vistaCotizacion, setVistaCotizacion] = useState<'nueva' | 'historial'>('nueva');
    const [listadoCotizaciones, setListadoCotizaciones] = useState<any[]>([]);
    const [cargandoListado, setCargandoListado] = useState(false);
    const [convirtiendoId, setConvirtiendoId] = useState<number | null>(null);

    // Modal de nuevo cliente
    const [modalClienteAbierto, setModalClienteAbierto] = useState(false);
    const [guardandoCliente, setGuardandoCliente] = useState(false);
    const [formCliente, setFormCliente] = useState({
        tipoIdentificacionId: 1,
        identificacion: '',
        razonSocial: '',
        direccion: '',
        telefono: '',
        correoElectronico: ''
    });

    // 1. Cargar Categorías
    useEffect(() => {
        api.get("Ventas/Categorias")
            .then((res) => {
                if (res.data && res.data.success) {
                    setCategorias(res.data.data);
                } else if (Array.isArray(res.data)) {
                    setCategorias(res.data);
                }
            })
            .catch((err) => console.error("Error cargando categorías:", err));
    }, []);

    // 2. Cargar Productos
    useEffect(() => {
        const url = categoriaActiva
            ? `productos/Listar?idCategoria=${categoriaActiva}`
            : "productos/Listar";

        api.get(url)
            .then((res) => {
                if (res.data && res.data.success) {
                    setProductos(res.data.data);
                } else if (Array.isArray(res.data)) {
                    setProductos(res.data);
                }
            })
            .catch((err) => {
                console.error("Error cargando productos:", err);
                setError("No se pudieron cargar los productos.");
            });
    }, [categoriaActiva]);

    const obtenerStockDisponible = (producto: Producto): number => {
        const idProd = producto.idProducto ?? (producto as any).id_producto;
        const stockAct = producto.stockActual ?? (producto as any).stock_actual ?? 0;

        const itemEnTicket = ticket.find((i) => i.idProducto === idProd);
        const cantidadEnTicket = itemEnTicket ? itemEnTicket.cantidad : 0;
        return stockAct - cantidadEnTicket;
    };

    const productosFiltrados = productos.filter((p) =>
        (p.nombre ?? "").toLowerCase().includes(busqueda.toLowerCase())
    );

    // Devuelve el precio unitario final de un producto, considerando promoción
    // de producto/categoría Y el descuento manual del vendedor — siempre gana
    // el que dé el precio más bajo (no se suman ambos descuentos).
    const calcularPrecioFinal = (producto: Producto): number => {
        const precioBase = producto.precioVenta ?? (producto as any).precio_venta ?? 0;
        const precioConPromo = producto.precioConDescuento ?? precioBase;

        // El descuento manual "por producto" solo aplica en modo Venta con ese modo elegido.
        // Si el vendedor eligió "por total", no tocamos el precio de cada línea aquí —
        // ese caso se descuenta aparte, como una sola línea sobre el total del ticket.
        if (modoOperacion === 'venta' && modoDescuentoManual === 'producto' && descuentoManual > 0) {
            const precioConDescuentoManual = Math.round(precioBase * (1 - descuentoManual / 100) * 100) / 100;
            return Math.min(precioConPromo, precioConDescuentoManual);
        }
        return precioConPromo;
    };

    const agregarAlTicket = (producto: Producto) => {
        const idProd = producto.idProducto ?? (producto as any).id_producto;
        // Precio final ya considerando promoción de producto/categoría Y descuento manual, el que sea menor
        const precioFinal = calcularPrecioFinal(producto);
        const permiteDecimales = producto.permiteDecimales ?? true;
        const stockDisponible = obtenerStockDisponible(producto);

        if (stockDisponible <= 0) {
            return;
        }

        setTicket((prev) => {
            const existente = prev.find((i) => i.idProducto === idProd);

            if (existente) {
                const nuevaCantidad = existente.permiteDecimales
                    ? existente.cantidad + 1
                    : Math.round(existente.cantidad + 1);
                return prev.map((i) =>
                    i.idProducto === idProd
                        ? { ...i, cantidad: nuevaCantidad, subtotal: nuevaCantidad * i.precioUnitario }
                        : i
                );
            }
            return [...prev, {
                idProducto: idProd,
                nombre: producto.nombre,
                precioUnitario: precioFinal,
                cantidad: 1,
                // Se mantiene en 0 porque este negocio no maneja IVA; el campo se conserva
                // solo por compatibilidad con el resto del sistema (backend, tipo ItemTicket).
                porcentajeIva: 0,
                descuento: 0,
                subtotal: precioFinal,
                permiteDecimales
            }];
        });
    };

    // Limpia el aviso de escaneo (éxito/error) solo, después de unos segundos.
    useEffect(() => {
        if (!mensajeScan) return;
        const t = setTimeout(() => setMensajeScan(null), 2500);
        return () => clearTimeout(t);
    }, [mensajeScan]);

    // Busca un producto por código de barras (llamado tanto por el lector USB como por la cámara).
    // Primero busca en los productos ya cargados en memoria (rápido, sin ir al servidor).
    // Si no aparece ahí (ej. porque hay un filtro de categoría activo y el producto es de otra),
    // hace un fallback al backend para no perder el escaneo.
    const buscarProductoPorCodigo = async (codigo: string) => {
        const codigoLimpio = codigo.trim();
        if (!codigoLimpio) return;

        const enMemoria = productos.find(p => {
            const cb = (p as any).codigoBarras ?? (p as any).codigo_barras;
            return cb && cb === codigoLimpio;
        });

        const agregarSiHayStock = (producto: Producto) => {
            const stockDisponible = obtenerStockDisponible(producto);
            if (stockDisponible <= 0) {
                setMensajeScan({ tipo: 'error', texto: `${producto.nombre} está agotado.` });
                return;
            }
            agregarAlTicket(producto);
            setMensajeScan({ tipo: 'exito', texto: `${producto.nombre} agregado.` });
        };

        if (enMemoria) {
            agregarSiHayStock(enMemoria);
            return;
        }

        try {
            const res = await api.get(`productos/BuscarPorCodigoBarras/${encodeURIComponent(codigoLimpio)}`);
            if (res.data.success && res.data.data) {
                agregarSiHayStock(res.data.data);
            } else {
                setMensajeScan({ tipo: 'error', texto: `No se encontró ningún producto con el código ${codigoLimpio}.` });
            }
        } catch {
            setMensajeScan({ tipo: 'error', texto: `No se encontró ningún producto con el código ${codigoLimpio}.` });
        }
    };

    // El lector USB queda "escuchando" siempre que no haya un modal abierto encima
    // (para no interferir con la escritura normal en esos formularios).
    const escanerHabilitado = !modalClienteAbierto && !reciboData && !cotizacionPdfData && !modoCamara;
    useBarcodeScanner(buscarProductoPorCodigo, escanerHabilitado);

    const cambiarCantidad = (idProducto: number, delta: number) => {
        const productoOriginal = productos.find(p => (p.idProducto ?? (p as any).id_producto) === idProducto);
        const stockMaximo = productoOriginal ? (productoOriginal.stockActual ?? (productoOriginal as any).stock_actual ?? 0) : 0;

        setTicket((prev) =>
            prev
                .map((i) => {
                    if (i.idProducto === idProducto) {
                        let nuevaCantidad = i.cantidad + delta;
                        if (!i.permiteDecimales) nuevaCantidad = Math.round(nuevaCantidad);

                        if (delta > 0 && nuevaCantidad > stockMaximo) {
                            alert(`Stock máximo disponible: ${stockMaximo}`);
                            return i;
                        }
                        return { ...i, cantidad: nuevaCantidad, subtotal: nuevaCantidad * i.precioUnitario };
                    }
                    return i;
                })
                .filter((i) => i.cantidad > 0)
        );
    };

    const cambiarPrecio = (idProducto: number, nuevoPrecio: number) => {
        if (isNaN(nuevoPrecio) || nuevoPrecio < 0) return;

        setTicket((prev) =>
            prev.map((i) =>
                i.idProducto === idProducto
                    ? { ...i, precioUnitario: nuevoPrecio, subtotal: nuevoPrecio * i.cantidad }
                    : i
            )
        );
    };

    // Fija la cantidad exacta de un item, ya convertida a "unidades de stock"
    // (1 quintal = 1 unidad) si venía del selector de conversión libra/arroba/quintal.
    const fijarCantidadExacta = (idProducto: number, nuevaCantidad: number) => {
        if (isNaN(nuevaCantidad) || nuevaCantidad <= 0) return;

        const productoOriginal = productos.find(p => (p.idProducto ?? (p as any).id_producto) === idProducto);
        const stockMaximo = productoOriginal ? (productoOriginal.stockActual ?? (productoOriginal as any).stock_actual ?? 0) : 0;
        const idCategoriaProducto = (productoOriginal as any)?.idCategoria ?? (productoOriginal as any)?.id_categoria ?? 0;
        const etiquetaUnidad = categoriaVendePorPeso(idCategoriaProducto) ? 'quintales' : '';

        if (nuevaCantidad > stockMaximo) {
            alert(`Stock máximo disponible: ${stockMaximo} ${etiquetaUnidad}`.trim());
            return;
        }

        setTicket((prev) =>
            prev.map((i) =>
                i.idProducto === idProducto
                    ? { ...i, cantidad: nuevaCantidad, subtotal: nuevaCantidad * i.precioUnitario }
                    : i
            )
        );
    };

    const eliminarItem = (idProducto: number) => {
        setTicket((prev) => prev.filter((i) => i.idProducto !== idProducto));
    };

    // Recalcula el precio de TODOS los items ya en el ticket usando el % de
    // descuento manual actual — útil si el vendedor agrega productos primero
    // y decide el descuento después, o si cambia el porcentaje.
    const aplicarDescuentoManualAlTicket = () => {
        setTicket((prev) =>
            prev.map((item) => {
                const prod = productos.find(p => (p.idProducto ?? (p as any).id_producto) === item.idProducto);
                if (!prod) return item;
                const nuevoPrecio = calcularPrecioFinal(prod);
                return { ...item, precioUnitario: nuevoPrecio, subtotal: nuevoPrecio * item.cantidad };
            })
        );
    };

    // Vuelve todos los precios del ticket al precio de promoción normal (sin descuento
    // manual "por producto" incrustado). Se usa al quitar el descuento y al cambiar
    // a modo "Sobre el total", para no terminar restando el descuento dos veces.
    const resetearPreciosAPromocion = () => {
        setTicket((prev) =>
            prev.map((item) => {
                const prod = productos.find(p => (p.idProducto ?? (p as any).id_producto) === item.idProducto);
                if (!prod) return item;
                const precioBase = prod.precioVenta ?? (prod as any).precio_venta ?? 0;
                const nuevoPrecio = prod.precioConDescuento ?? precioBase;
                return { ...item, precioUnitario: nuevoPrecio, subtotal: nuevoPrecio * item.cantidad };
            })
        );
    };

    // Quita el descuento manual y vuelve al precio de promoción (si el producto tiene una).
    const quitarDescuentoManual = () => {
        setDescuentoManual(0);
        resetearPreciosAPromocion();
    };

    const buscarClientes = async (texto: string) => {
        setClienteBusqueda(texto);
        if (texto.length < 2) {
            setClienteResultados([]);
            setMostrarDropdown(false);
            return;
        }
        try {
            const res = await api.get(`Ventas/Clientes?busqueda=${texto}`);
            if (res.data.success) setClienteResultados(res.data.data);
            else if (Array.isArray(res.data)) setClienteResultados(res.data);
            setMostrarDropdown(true);
        } catch {
            setClienteResultados([]);
        }
    };

    const seleccionarCliente = (cliente: Cliente) => {
        setClienteSeleccionado(cliente);
        setClienteBusqueda("");
        setClienteResultados([]);
        setMostrarDropdown(false);
    };

    const abrirModalNuevoCliente = () => {
        setFormCliente({
            tipoIdentificacionId: 1,
            identificacion: clienteBusqueda,
            razonSocial: '',
            direccion: '',
            telefono: '',
            correoElectronico: ''
        });
        setModalClienteAbierto(true);
    };

    const guardarNuevoCliente = async (e: React.FormEvent) => {
        e.preventDefault();
        setGuardandoCliente(true);
        setError(null);
        try {
            const respuesta = await api.post('clientes/insertar', formCliente);
            if (respuesta.data.success) {
                setModalClienteAbierto(false);
                const res = await api.get(`Ventas/Clientes?busqueda=${formCliente.identificacion}`);
                const lista = res.data.success ? res.data.data : (Array.isArray(res.data) ? res.data : []);
                const nuevoCliente = lista.find((c: any) =>
                    (c.identificacion ?? c.identificacion) === formCliente.identificacion
                );
                if (nuevoCliente) {
                    seleccionarCliente(nuevoCliente);
                } else {
                    setMostrarDropdown(false);
                }
            }
        } catch (err: any) {
            setError(err.response?.data?.mensaje || 'Error al registrar el cliente');
        } finally {
            setGuardandoCliente(false);
        }
    };

    // Sin IVA: el total es simplemente la suma de los subtotales
    // (ya con descuento de promoción y/o descuento manual "por producto" aplicado, si corresponde).
    const total = ticket.reduce((s, i) => s + i.subtotal, 0);

    // Cuánto se está ahorrando el cliente por promociones Y/O por el descuento manual
    // "por producto" — cualquier diferencia entre el precio de lista y el precio final.
    const totalAhorroPromociones = ticket.reduce((s, item) => {
        const prod = productos.find(p => (p.idProducto ?? (p as any).id_producto) === item.idProducto);
        if (!prod) return s;
        const precioOriginal = prod.precioVenta ?? (prod as any).precio_venta ?? item.precioUnitario;
        const ahorroUnitario = precioOriginal - item.precioUnitario;
        return s + (ahorroUnitario > 0 ? ahorroUnitario * item.cantidad : 0);
    }, 0);

    // Descuento manual "por total": una sola línea de descuento sobre el total del ticket,
    // sin comparar contra la promoción de cada producto individual. Solo aplica en modo Venta.
    const montoDescuentoManualTotal =
        (modoOperacion === 'venta' && modoDescuentoManual === 'total' && descuentoManual > 0)
            ? Math.round(total * (descuentoManual / 100) * 100) / 100
            : 0;

    // Este es el monto que realmente se cobra/registra — ya con el descuento "por total" restado, si aplica.
    const totalFinal = total - montoDescuentoManualTotal;

    // Subtotal "antes" del descuento — es simplemente el total final + lo que se ahorró.
    const subtotalAntesDescuento = total + totalAhorroPromociones;

    const limpiarTicketCotizacion = () => {
        setTicket([]);
        setClienteSeleccionado(null);
        setNombreProspecto('');
        setTelefonoProspecto('');
    };

    const construirPayloadCotizacion = () => ({
        idCliente: modoCliente === 'registrado'
            ? (clienteSeleccionado?.idCliente ?? (clienteSeleccionado as any)?.id_cliente)
            : null,
        nombreProspecto: modoCliente === 'prospecto' ? nombreProspecto : null,
        telefonoProspecto: modoCliente === 'prospecto' ? telefonoProspecto : null,
        idUsuario: usuario?.id || 1,
        subtotal: subtotalAntesDescuento,
        descuentoPromociones: totalAhorroPromociones,
        total,
        detalle: ticket.map((i) => ({
            idProducto: i.idProducto,
            nombreProducto: i.nombre,
            cantidad: i.cantidad,
            precioUnitario: i.precioUnitario,
            subtotal: i.subtotal
        }))
    });

    const handleGenerarPdfCotizacion = async () => {
        setError(null);
        if (modoCliente === 'registrado' && !clienteSeleccionado) {
            setError('Selecciona un cliente registrado.');
            return;
        }
        if (modoCliente === 'prospecto' && !nombreProspecto.trim()) {
            setError('Ingresa el nombre del prospecto.');
            return;
        }
        if (ticket.length === 0) {
            setError('Agrega al menos un producto.');
            return;
        }
        setCargando(true);
        try {
            const respuesta = await api.post("Cotizaciones/Registrar", construirPayloadCotizacion());
            if (respuesta.data.success) {
                setCotizacionPdfData({
                    idCotizacion: respuesta.data.idCotizacion,
                    fecha: new Date().toISOString(),
                    cliente: modoCliente === 'registrado'
                        ? (clienteSeleccionado?.razonSocial ?? (clienteSeleccionado as any)?.razon_social)
                        : nombreProspecto,
                    telefonoCliente: modoCliente === 'prospecto' ? telefonoProspecto : undefined,
                    detalle: ticket.map((i) => ({
                        producto: i.nombre,
                        cantidad: i.cantidad,
                        precioUnitario: i.precioUnitario,
                        subtotal: i.subtotal
                    })),
                    subtotal: subtotalAntesDescuento,
                    descuentoPromociones: totalAhorroPromociones,
                    total
                });
                limpiarTicketCotizacion();
            } else {
                setError(respuesta.data.mensaje || "Error al registrar la cotización");
            }
        } catch (err: any) {
            setError(err.response?.data?.mensaje || "Error al registrar la cotización");
        } finally {
            setCargando(false);
        }
    };

    const handleConvertirCotizacionAVenta = async () => {
        setError(null);
        if (modoCliente !== 'registrado' || !clienteSeleccionado) {
            setError('Para convertir directo a venta, el destinatario debe ser un cliente registrado, no un prospecto.');
            return;
        }
        if (ticket.length === 0) {
            setError('Agrega al menos un producto.');
            return;
        }
        setCargando(true);
        try {
            const respuestaCotizacion = await api.post("Cotizaciones/Registrar", construirPayloadCotizacion());
            if (!respuestaCotizacion.data.success) {
                setError(respuestaCotizacion.data.mensaje || "Error al registrar la cotización");
                return;
            }
            const idCotizacion = respuestaCotizacion.data.idCotizacion;

            const respuestaConversion = await api.post(`Cotizaciones/${idCotizacion}/ConvertirAVenta`, {
                idUsuario: usuario?.id || 1,
                formaPago: formaPago
            });

            if (respuestaConversion.data.success) {
                setError(null);
                limpiarTicketCotizacion();
                // Reutilizamos el mismo modal de recibo que usa una venta normal,
                // ya que la cotización convertida es, a todos los efectos, una venta real.
                alert(`Cotización convertida a Venta #${respuestaConversion.data.idVenta} correctamente.`);
                const url = categoriaActiva ? `productos/Listar?idCategoria=${categoriaActiva}` : "productos/Listar";
                api.get(url).then((res) => {
                    if (res.data && res.data.success) setProductos(res.data.data);
                    else if (Array.isArray(res.data)) setProductos(res.data);
                });
            } else {
                setError(respuestaConversion.data.mensaje || "La cotización se guardó, pero no se pudo convertir a venta.");
            }
        } catch (err: any) {
            setError(err.response?.data?.mensaje || "Error al convertir la cotización a venta");
        } finally {
            setCargando(false);
        }
    };

    const cargarListadoCotizaciones = () => {
        setCargandoListado(true);
        api.get('Cotizaciones/Listar')
            .then(res => setListadoCotizaciones(res.data.data ?? []))
            .catch(() => setListadoCotizaciones([]))
            .finally(() => setCargandoListado(false));
    };

    useEffect(() => {
        if (modoOperacion === 'cotizacion' && vistaCotizacion === 'historial') {
            cargarListadoCotizaciones();
        }
    }, [modoOperacion, vistaCotizacion]);

    const verPdfDeCotizacionPasada = async (idCotizacion: number) => {
        setError(null);
        try {
            const res = await api.get(`Cotizaciones/${idCotizacion}/Detalle`);
            if (res.data.success) {
                const d = res.data.data;
                setCotizacionPdfData({
                    idCotizacion: d.idCotizacion,
                    fecha: d.fecha,
                    cliente: d.nombreCliente,
                    telefonoCliente: d.telefonoCliente,
                    detalle: d.detalle.map((item: any) => ({
                        producto: item.nombreProducto,
                        cantidad: item.cantidad,
                        precioUnitario: item.precioUnitario,
                        subtotal: item.subtotal
                    })),
                    subtotal: d.subtotal,
                    descuentoPromociones: d.descuentoPromociones,
                    total: d.total
                });
            } else {
                setError(res.data.mensaje || 'No se pudo cargar la cotización.');
            }
        } catch (err: any) {
            setError(err.response?.data?.mensaje || 'Error al cargar la cotización.');
        }
    };

    const convertirDesdeHistorial = async (idCotizacion: number) => {
        setError(null);
        setConvirtiendoId(idCotizacion);
        try {
            const res = await api.post(`Cotizaciones/${idCotizacion}/ConvertirAVenta`, {
                idUsuario: usuario?.id || 1,
                formaPago: 'EFECTIVO'
            });
            if (res.data.success) {
                alert(`Cotización convertida a Venta #${res.data.idVenta} correctamente.`);
                cargarListadoCotizaciones();
            } else {
                setError(res.data.mensaje || 'No se pudo convertir la cotización.');
            }
        } catch (err: any) {
            setError(err.response?.data?.mensaje || 'Error al convertir la cotización.');
        } finally {
            setConvirtiendoId(null);
        }
    };

    const handlePagar = async () => {
        if (!clienteSeleccionado) {
            setError("Debes seleccionar un cliente antes de pagar.");
            return;
        }
        if (ticket.length === 0) return;
        setCargando(true);
        setError(null);
        try {
            // Si el descuento es "por total", prorrateamos ese descuento entre todos los
            // productos antes de guardar — así el detalle por producto en la BD sigue
            // cuadrando con el total de la venta, y tus reportes de utilidad no se desfasan.
            const factorDescuentoTotal = montoDescuentoManualTotal > 0 && total > 0 ? totalFinal / total : 1;

            const detalleParaGuardar = ticket.map((i) => {
                const precioAjustado = montoDescuentoManualTotal > 0
                    ? Math.round(i.precioUnitario * factorDescuentoTotal * 100) / 100
                    : i.precioUnitario;
                const subtotalAjustado = Math.round(precioAjustado * i.cantidad * 100) / 100;
                return { ...i, precioUnitario: precioAjustado, subtotal: subtotalAjustado };
            });

            const respuesta = await api.post("Ventas/Registrar", {
                idCliente: clienteSeleccionado.idCliente ?? (clienteSeleccionado as any).id_cliente,
                idUsuario: usuario?.id || 1,
                // Se mantiene la estructura de campos que ya espera el backend/SP,
                // pero todo el monto va a "IVA 0%" ya que este negocio no maneja IVA.
                subtotalIva0: totalFinal,
                subtotalIva15: 0,
                montoIva: 0,
                total: totalFinal,
                formaPago,
                detalle: detalleParaGuardar.map((i) => ({
                    idProducto: i.idProducto,
                    cantidad: i.cantidad,
                    precioUnitario: i.precioUnitario,
                    porcentajeIva: 0,
                    descuento: i.descuento,
                    subtotal: i.subtotal
                }))
            });
            if (respuesta.data.success || respuesta.data.idVenta) {
                setReciboData({
                    idVenta: respuesta.data.idVenta,
                    fecha: new Date().toISOString(),
                    cliente: clienteSeleccionado.razonSocial ?? (clienteSeleccionado as any).razon_social,
                    identificacionCliente: clienteSeleccionado.identificacion ?? (clienteSeleccionado as any).identificacion,
                    emailCliente: clienteSeleccionado.email ?? (clienteSeleccionado as any).correo_electronico,
                    detalle: detalleParaGuardar.map((i) => ({
                        producto: i.nombre,
                        cantidad: i.cantidad,
                        precioUnitario: i.precioUnitario,
                        subtotal: i.subtotal
                    })),
                    subtotal: subtotalAntesDescuento,
                    descuentoPromociones: totalAhorroPromociones,
                    descuentoManualPorcentaje: descuentoManual,
                    modoDescuentoManual,
                    descuentoManualTotal: montoDescuentoManualTotal,
                    total: totalFinal,
                    formaPago
                });

                setTicket([]);
                setClienteSeleccionado(null);
                setDescuentoManual(0);
                setModoDescuentoManual('producto');

                const url = categoriaActiva ? `productos/Listar?idCategoria=${categoriaActiva}` : "productos/Listar";
                api.get(url).then((res) => {
                    if (res.data && res.data.success) setProductos(res.data.data);
                    else if (Array.isArray(res.data)) setProductos(res.data);
                });
            }
        } catch (err: any) {
            setError(err.response?.data?.mensaje || "Error al registrar la venta");
        } finally {
            setCargando(false);
        }
    };

    const renderImagenProducto = (producto: Producto) => {
        let imagenPath = (producto as any).imagen || (producto as any).urlImagen || (producto as any).url_imagen;
        if (!imagenPath) return "🌱";

        if (imagenPath.startsWith("http")) {
            return (
                <img
                    src={imagenPath}
                    alt={producto.nombre}
                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }}
                />
            );
        }

        imagenPath = imagenPath.replace(/^\/?api\//i, "");

        if (!imagenPath.startsWith("/")) {
            imagenPath = "/" + imagenPath;
        }

        const urlBaseLimpia = window.location.hostname === "localhost"
            ? "https://localhost:7145"
            : window.location.origin;

        const srcUrl = `${urlBaseLimpia}${imagenPath}`;

        return (
            <img
                src={srcUrl}
                alt={producto.nombre}
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }}
                onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    const parent = (e.target as HTMLImageElement).parentElement;
                    if (parent) parent.innerText = "🌱";
                }}
            />
        );
    };

    const renderBadgeVencimiento = (producto: Producto) => {
        const fechaVenc = (producto as any).fechaVencimiento;
        const dias = (producto as any).diasRestantes;

        if (!fechaVenc || dias === null || dias === undefined) return null;

        let color = "#16a34a";
        if (dias <= 7) color = "#ef4444";
        else if (dias <= 15) color = "#f59e0b";

        const fecha = new Date(fechaVenc).toLocaleDateString();

        return (
            <span style={{ fontSize: "11px", fontWeight: 600, color }}>
                Vence: {fecha} ({dias}d)
            </span>
        );
    };

    const renderPrecioProducto = (producto: Producto) => {
        const precioVen = producto.precioVenta ?? (producto as any).precio_venta ?? 0;
        const tienePromocion = producto.idPromocion != null && producto.precioConDescuento != null;

        if (!tienePromocion) {
            return <span className="pos-producto-precio">${Number(precioVen).toFixed(2)}</span>;
        }

        return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: "12px", color: "#9ca3af", textDecoration: "line-through" }}>
                        ${Number(precioVen).toFixed(2)}
                    </span>
                    <span className="pos-producto-precio" style={{ color: "#ef4444" }}>
                        ${Number(producto.precioConDescuento).toFixed(2)}
                    </span>
                </div>
                <span style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "#fff",
                    backgroundColor: "#ef4444",
                    borderRadius: "4px",
                    padding: "1px 6px"
                }}>
                    -{Number(producto.valorDescuento).toFixed(0)}% {producto.promocionNombre ? `· ${producto.promocionNombre}` : ""}
                </span>
            </div>
        );
    };

    return (
        <div className="pos-wrapper">
            {/* Categorías */}
            <div className="pos-categorias">
                <button
                    className={`pos-categoria-btn ${categoriaActiva === null ? "active" : ""}`}
                    onClick={() => setCategoriaActiva(null)}
                >
                    <span className="pos-categoria-icon">🌿</span>
                    Todos
                </button>
                {categorias.map((cat) => {
                    const idCat = cat.idCategoria ?? (cat as any).id_categoria;
                    return (
                        <button
                            key={idCat}
                            className={`pos-categoria-btn ${categoriaActiva === idCat ? "active" : ""}`}
                            onClick={() => setCategoriaActiva(idCat)}
                        >
                            <span className="pos-categoria-icon">
                                {iconosCategorias[cat.nombre] || "📦"}
                            </span>
                            {cat.nombre}
                        </button>
                    );
                })}
            </div>

            {/* Panel de Productos */}
            <div className="pos-productos-panel">
                <div className="pos-header">
                    <h2 className="pos-title">Punto de Venta</h2>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{ display: 'flex', border: '1px solid #d1d5db', borderRadius: 8, overflow: 'hidden' }}>
                            <button
                                onClick={() => setModoOperacion('venta')}
                                style={{
                                    padding: '6px 14px', fontSize: 13, border: 'none', cursor: 'pointer',
                                    background: modoOperacion === 'venta' ? '#0f2a1f' : '#fff',
                                    color: modoOperacion === 'venta' ? '#fff' : '#374151'
                                }}
                            >
                                Venta
                            </button>
                            <button
                                onClick={() => setModoOperacion('cotizacion')}
                                style={{
                                    padding: '6px 14px', fontSize: 13, border: 'none', cursor: 'pointer',
                                    background: modoOperacion === 'cotizacion' ? '#0f2a1f' : '#fff',
                                    color: modoOperacion === 'cotizacion' ? '#fff' : '#374151'
                                }}
                            >
                                <LuFileText size={14} style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
                                Cotización
                            </button>
                        </div>

                        {modoOperacion === 'cotizacion' && (
                            <div style={{ display: 'flex', border: '1px solid #d1d5db', borderRadius: 8, overflow: 'hidden' }}>
                                <button
                                    onClick={() => setVistaCotizacion('nueva')}
                                    style={{
                                        padding: '6px 14px', fontSize: 13, border: 'none', cursor: 'pointer',
                                        background: vistaCotizacion === 'nueva' ? '#e5e7eb' : '#fff',
                                        color: '#374151'
                                    }}
                                >
                                    Nueva
                                </button>
                                <button
                                    onClick={() => setVistaCotizacion('historial')}
                                    style={{
                                        padding: '6px 14px', fontSize: 13, border: 'none', cursor: 'pointer',
                                        background: vistaCotizacion === 'historial' ? '#e5e7eb' : '#fff',
                                        color: '#374151'
                                    }}
                                >
                                    Historial
                                </button>
                            </div>
                        )}

                        {!(modoOperacion === 'cotizacion' && vistaCotizacion === 'historial') && (
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <div className="pos-search">
                                    <LuSearch className="pos-search-icon" />
                                    <input
                                        type="text"
                                        placeholder="Buscar o escanear producto..."
                                        value={busqueda}
                                        onChange={(e) => setBusqueda(e.target.value)}
                                    />
                                </div>
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={() => setModoCamara(true)}
                                    title="Escanear con la cámara"
                                    style={{ display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}
                                >
                                    <LuCamera size={16} /> Escanear
                                </button>
                                <span
                                    title={escanerHabilitado ? 'El lector USB está activo' : 'El lector USB está pausado (hay un modal abierto)'}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
                                        color: escanerHabilitado ? '#16a34a' : '#9ca3af', whiteSpace: 'nowrap'
                                    }}
                                >
                                    <span style={{
                                        width: 7, height: 7, borderRadius: '50%',
                                        background: escanerHabilitado ? '#16a34a' : '#9ca3af'
                                    }} />
                                    {escanerHabilitado ? 'Lector activo' : 'Lector pausado'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {mensajeScan && (
                    <div
                        style={{
                            margin: '0 0 12px', padding: '8px 12px', borderRadius: 8, fontSize: 13,
                            background: mensajeScan.tipo === 'exito' ? '#EAF3DE' : '#FCEBEB',
                            color: mensajeScan.tipo === 'exito' ? '#27500A' : '#791F1F'
                        }}
                    >
                        {mensajeScan.texto}
                    </div>
                )}

                {modoOperacion === 'cotizacion' && vistaCotizacion === 'historial' ? (
                    <div className="table-container">
                        {cargandoListado ? (
                            <p className="pos-empty">Cargando...</p>
                        ) : listadoCotizaciones.length === 0 ? (
                            <p className="pos-empty">No hay cotizaciones registradas.</p>
                        ) : (
                            <table className="clientes-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Fecha</th>
                                        <th>Cliente</th>
                                        <th>Total</th>
                                        <th>Estado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {listadoCotizaciones.map((c) => (
                                        <tr key={c.idCotizacion}>
                                            <td>{c.idCotizacion}</td>
                                            <td>{new Date(c.fecha).toLocaleDateString()}</td>
                                            <td>{c.nombreCliente}</td>
                                            <td>${Number(c.total).toFixed(2)}</td>
                                            <td>
                                                {c.estado === 'Convertida' ? (
                                                    <span style={{ color: '#16a34a', fontWeight: 600 }}>
                                                        Convertida {c.idVentaGenerada ? `(Venta #${c.idVentaGenerada})` : ''}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: '#9ca3af' }}>Pendiente</span>
                                                )}
                                            </td>
                                            <td>
                                                <button
                                                    className="btn-action-text"
                                                    style={{ marginRight: 8 }}
                                                    onClick={() => verPdfDeCotizacionPasada(c.idCotizacion)}
                                                >
                                                    Ver PDF
                                                </button>
                                                {c.estado !== 'Convertida' && (
                                                    <button
                                                        className="btn-action-text"
                                                        onClick={() => convertirDesdeHistorial(c.idCotizacion)}
                                                        disabled={convirtiendoId === c.idCotizacion}
                                                    >
                                                        {convirtiendoId === c.idCotizacion ? 'Convirtiendo...' : 'Convertir a Venta'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                ) : (
                    <>
                        <p className="pos-subtitulo">
                            {categoriaActiva
                                ? categorias.find(c => (c.idCategoria ?? (c as any).id_categoria) === categoriaActiva)?.nombre || "Categoría Seleccionada"
                                : "Todos los productos"}
                        </p>

                        {productosFiltrados.length === 0 ? (
                            <p className="pos-empty">No hay productos disponibles</p>
                        ) : (
                            <div className="pos-grid">
                                {productosFiltrados.map((producto) => {
                                    const idProd = producto.idProducto ?? (producto as any).id_producto;
                                    const stockDisponible = obtenerStockDisponible(producto);
                                    const estaAgotado = stockDisponible <= 0;
                                    const tienePromocion = producto.idPromocion != null && producto.precioConDescuento != null;

                                    return (
                                        <div
                                            key={idProd}
                                            className={`pos-producto-card ${estaAgotado ? "sin-stock" : ""}`}
                                            onClick={() => !estaAgotado && agregarAlTicket(producto)}
                                            style={{
                                                cursor: estaAgotado ? "not-allowed" : "pointer",
                                                opacity: estaAgotado ? 0.8 : 1,
                                                position: "relative",
                                                borderColor: tienePromocion ? "#ef4444" : undefined
                                            }}
                                        >
                                            {tienePromocion && (
                                                <span style={{
                                                    position: "absolute",
                                                    top: 6,
                                                    left: 6,
                                                    fontSize: "9px",
                                                    fontWeight: 700,
                                                    color: "#fff",
                                                    backgroundColor: "#ef4444",
                                                    borderRadius: "4px",
                                                    padding: "2px 5px"
                                                }}>
                                                    PROMO
                                                </span>
                                            )}
                                            <div className="pos-producto-img">
                                                {renderImagenProducto(producto)}
                                            </div>
                                            <span className="pos-producto-nombre">{producto.nombre}</span>
                                            {renderPrecioProducto(producto)}

                                            <span className={`pos-producto-stock ${estaAgotado ? "text-danger" : ""}`} style={estaAgotado ? { color: "red", fontWeight: "bold" } : undefined}>
                                                {estaAgotado ? "Agotado (0)" : `Stock: ${stockDisponible}`}
                                            </span>
                                            {renderBadgeVencimiento(producto)}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Ticket de Venta */}
            {!(modoOperacion === 'cotizacion' && vistaCotizacion === 'historial') && (
                <div className="pos-ticket">
                    <h3 className="pos-ticket-title">
                        <LuShoppingCart style={{ marginRight: 8 }} />
                        Ticket
                    </h3>

                    {error && <div className="error-message" style={{ color: "red", marginBottom: "10px", fontSize: "14px" }}>{error}</div>}

                    {/* Buscador de cliente (o prospecto, si estamos cotizando) */}
                    {modoOperacion === 'cotizacion' && (
                        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                            <button
                                className="btn"
                                style={{
                                    flex: 1, fontSize: 12, padding: '6px 8px',
                                    background: modoCliente === 'registrado' ? undefined : '#fff',
                                    color: modoCliente === 'registrado' ? undefined : '#374151',
                                    border: modoCliente === 'registrado' ? undefined : '1px solid #d1d5db'
                                }}
                                onClick={() => setModoCliente('registrado')}
                            >
                                Cliente registrado
                            </button>
                            <button
                                className="btn"
                                style={{
                                    flex: 1, fontSize: 12, padding: '6px 8px',
                                    background: modoCliente === 'prospecto' ? undefined : '#fff',
                                    color: modoCliente === 'prospecto' ? undefined : '#374151',
                                    border: modoCliente === 'prospecto' ? undefined : '1px solid #d1d5db'
                                }}
                                onClick={() => setModoCliente('prospecto')}
                            >
                                <LuUserPlus size={13} style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
                                Prospecto
                            </button>
                        </div>
                    )}

                    {modoOperacion === 'cotizacion' && modoCliente === 'prospecto' ? (
                        <div style={{ marginBottom: 12 }}>
                            <div className="form-group">
                                <label className="form-label">Nombre del prospecto</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={nombreProspecto}
                                    onChange={(e) => setNombreProspecto(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Teléfono (opcional)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={telefonoProspecto}
                                    onChange={(e) => setTelefonoProspecto(e.target.value)}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="pos-cliente-search">
                            <label>Cliente</label>
                            {clienteSeleccionado ? (
                                <div className="pos-cliente-seleccionado">
                                    <span>{clienteSeleccionado.razonSocial ?? (clienteSeleccionado as any).razon_social}</span>
                                    <button onClick={() => setClienteSeleccionado(null)}>✕</button>
                                </div>
                            ) : (
                                <>
                                    <div className="pos-cliente-input-wrap">
                                        <LuSearch size={14} color="#9ca3af" />
                                        <input
                                            type="text"
                                            placeholder="Buscar cliente..."
                                            value={clienteBusqueda}
                                            onChange={(e) => buscarClientes(e.target.value)}
                                            onBlur={() => setTimeout(() => setMostrarDropdown(false), 200)}
                                        />
                                    </div>
                                    {mostrarDropdown && clienteResultados.length > 0 && (
                                        <div className="pos-cliente-dropdown">
                                            {clienteResultados.map((c) => {
                                                const idCli = c.idCliente ?? (c as any).id_cliente;
                                                return (
                                                    <div
                                                        key={idCli}
                                                        className="pos-cliente-option"
                                                        onClick={() => seleccionarCliente(c)}
                                                    >
                                                        <div className="pos-cliente-nombre">{c.razonSocial ?? (c as any).razon_social}</div>
                                                        <div className="pos-cliente-ruc">{c.identificacion ?? (c as any).identificacion}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {mostrarDropdown && clienteBusqueda.length >= 2 && clienteResultados.length === 0 && (
                                        <div className="pos-cliente-dropdown">
                                            <div
                                                className="pos-cliente-option"
                                                style={{ color: '#16a34a', fontWeight: 600, textAlign: 'center' }}
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={abrirModalNuevoCliente}
                                            >
                                                + Cliente no encontrado. Crear nuevo
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {modoOperacion === 'venta' && (
                        <div style={{ marginBottom: 10 }}>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                                <button
                                    onClick={() => setModoDescuentoManual('producto')}
                                    style={{
                                        flex: 1, fontSize: 11, padding: '5px 8px', borderRadius: 6, cursor: 'pointer',
                                        border: modoDescuentoManual === 'producto' ? '1px solid #0f2a1f' : '1px solid #d1d5db',
                                        background: modoDescuentoManual === 'producto' ? '#0f2a1f' : '#fff',
                                        color: modoDescuentoManual === 'producto' ? '#fff' : '#374151'
                                    }}
                                    title="Compara el % contra la promoción de cada producto, gana el precio más bajo"
                                >
                                    Por producto
                                </button>
                                <button
                                    onClick={() => {
                                        setModoDescuentoManual('total');
                                        resetearPreciosAPromocion();
                                    }}
                                    style={{
                                        flex: 1, fontSize: 11, padding: '5px 8px', borderRadius: 6, cursor: 'pointer',
                                        border: modoDescuentoManual === 'total' ? '1px solid #0f2a1f' : '1px solid #d1d5db',
                                        background: modoDescuentoManual === 'total' ? '#0f2a1f' : '#fff',
                                        color: modoDescuentoManual === 'total' ? '#fff' : '#374151'
                                    }}
                                    title="Aplica el % como una sola línea de descuento sobre el total del ticket"
                                >
                                    Sobre el total
                                </button>
                            </div>

                            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                                <div style={{ flex: 1 }}>
                                    <label className="form-label" style={{ fontSize: 11 }}>Descuento manual (%)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        min="0"
                                        max="100"
                                        step="1"
                                        value={descuentoManual}
                                        onChange={(e) => {
                                            const val = Number(e.target.value);
                                            setDescuentoManual(isNaN(val) ? 0 : Math.min(100, Math.max(0, val)));
                                        }}
                                        placeholder="Ej: 20"
                                        style={{ fontSize: 13, padding: '6px 8px' }}
                                    />
                                </div>

                                {modoDescuentoManual === 'producto' && (
                                    <>
                                        <button
                                            className="btn"
                                            style={{ fontSize: 12, padding: '6px 10px' }}
                                            onClick={aplicarDescuentoManualAlTicket}
                                            disabled={ticket.length === 0}
                                            title="Aplica el % a los productos ya agregados. Los nuevos productos que agregues después ya lo toman automático."
                                        >
                                            Aplicar
                                        </button>
                                        {descuentoManual > 0 && (
                                            <button
                                                className="btn"
                                                style={{ fontSize: 12, padding: '6px 10px', background: '#fff', color: '#374151', border: '1px solid #d1d5db' }}
                                                onClick={quitarDescuentoManual}
                                                title="Quita el descuento manual y vuelve al precio de promoción (si aplica)"
                                            >
                                                Quitar
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                            {modoDescuentoManual === 'total' && descuentoManual > 0 && (
                                <p style={{ fontSize: 11, color: '#6c757d', margin: '4px 0 0' }}>
                                    Se aplica automático como una línea de descuento en el total — no toca el precio de cada producto.
                                </p>
                            )}
                        </div>
                    )}

                    <div className="pos-ticket-items-header">
                        <span>Items</span>
                        <span>Cant.</span>
                        <span>Total</span>
                    </div>

                    <div className="pos-ticket-items">
                        {ticket.length === 0 ? (
                            <p className="pos-empty">Agrega productos al ticket</p>
                        ) : (
                            ticket.map((item) => {
                                const productoDelItem = productos.find(p => (p.idProducto ?? (p as any).id_producto) === item.idProducto);
                                const idCategoriaItem = (productoDelItem as any)?.idCategoria ?? (productoDelItem as any)?.id_categoria ?? 0;

                                const tienePromoItem = productoDelItem?.precioConDescuento != null;
                                const precioOriginalItem = tienePromoItem
                                    ? (productoDelItem?.precioVenta ?? (productoDelItem as any)?.precio_venta ?? item.precioUnitario)
                                    : item.precioUnitario;
                                const hayAhorroItem = tienePromoItem && precioOriginalItem > item.precioUnitario;

                                return (
                                    <div key={item.idProducto} className="pos-ticket-item">
                                        <div>
                                            <div className="pos-ticket-item-nombre">{item.nombre}</div>
                                            {hayAhorroItem && (
                                                <div style={{ fontSize: "10px", color: "#9ca3af", textDecoration: "line-through" }}>
                                                    antes: ${precioOriginalItem.toFixed(2)} c/u
                                                </div>
                                            )}
                                            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                                                <span style={{ fontSize: "11px", color: "#9ca3af" }}>$</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={item.precioUnitario}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        cambiarPrecio(item.idProducto, parseFloat(e.target.value));
                                                    }}
                                                    style={{
                                                        width: '55px',
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '4px',
                                                        padding: '2px 4px',
                                                        fontSize: '11px',
                                                        outline: 'none',
                                                        color: '#4b5563'
                                                    }}
                                                />
                                                <button
                                                    className="pos-ticket-item-delete"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        eliminarItem(item.idProducto);
                                                    }}
                                                >
                                                    <LuTrash2 size={12} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="pos-ticket-item-cant">
                                            {categoriaVendePorPeso(idCategoriaItem) ? (
                                                <SelectorCantidadPeso
                                                    valorInicialUnidadesDeStock={item.cantidad}
                                                    onCambiar={(cantidad) => fijarCantidadExacta(item.idProducto, cantidad)}
                                                />
                                            ) : (
                                                <>
                                                    <button onClick={() => cambiarCantidad(item.idProducto, 1)}>-</button>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        step="1"
                                                        value={item.cantidad}
                                                        onChange={(e) => {
                                                            const val = Math.round(parseFloat(e.target.value));
                                                            const productoOriginal = productos.find(p => (p.idProducto ?? (p as any).id_producto) === item.idProducto);
                                                            const stockMaximo = productoOriginal ? (productoOriginal.stockActual ?? (productoOriginal as any).stock_actual ?? 0) : 0;

                                                            if (!isNaN(val) && val > 0) {
                                                                if (val > stockMaximo) {
                                                                    alert(`Stock máximo disponible: ${stockMaximo}`);
                                                                    return;
                                                                }
                                                                fijarCantidadExacta(item.idProducto, val);
                                                            }
                                                        }}
                                                        style={{
                                                            width: '48px',
                                                            textAlign: 'center',
                                                            border: '1px solid #e5e7eb',
                                                            borderRadius: '4px',
                                                            padding: '2px 4px',
                                                            fontSize: '13px',
                                                            outline: 'none'
                                                        }}
                                                    />
                                                    <button onClick={() => cambiarCantidad(item.idProducto, 1)}>+</button>
                                                </>
                                            )}
                                        </div>
                                        <div className="pos-ticket-item-subtotal">
                                            {hayAhorroItem && (
                                                <div style={{ fontSize: "10px", color: "#9ca3af", textDecoration: "line-through" }}>
                                                    ${(precioOriginalItem * item.cantidad).toFixed(2)}
                                                </div>
                                            )}
                                            ${item.subtotal.toFixed(2)}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="pos-ticket-totales">
                        <div className="pos-ticket-fila">
                            <span>Subtotal</span>
                            <span>${subtotalAntesDescuento.toFixed(2)}</span>
                        </div>
                        {totalAhorroPromociones > 0 && (
                            <div className="pos-ticket-fila" style={{ color: "#ef4444" }}>
                                <span>{descuentoManual > 0 && modoDescuentoManual === 'producto' ? 'Descuento aplicado' : 'Descuento por promociones'}</span>
                                <span>-${totalAhorroPromociones.toFixed(2)}</span>
                            </div>
                        )}
                        {montoDescuentoManualTotal > 0 && (
                            <div className="pos-ticket-fila" style={{ color: "#ef4444" }}>
                                <span>Descuento manual ({descuentoManual}%)</span>
                                <span>-${montoDescuentoManualTotal.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="pos-ticket-total">
                            <span>Total</span>
                            <span>${totalFinal.toFixed(2)}</span>
                        </div>
                    </div>

                    {modoOperacion === 'venta' ? (
                        <>
                            <div className="pos-forma-pago">
                                <label>Forma de Pago</label>
                                <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)}>
                                    <option value="EFECTIVO">Efectivo</option>
                                    {/*<option value="TARJETA">Tarjeta</option>*/}
                                    <option value="TRANSFERENCIA">Transferencia</option>
                                </select>
                            </div>

                            <button
                                className="pos-btn-pagar"
                                onClick={handlePagar}
                                disabled={cargando || ticket.length === 0}
                            >
                                {cargando ? "Procesando..." : `Pagar $${totalFinal.toFixed(2)}`}
                            </button>
                        </>
                    ) : (
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                className="btn"
                                style={{ flex: 1, background: '#fff', color: '#0f2a1f', border: '1px solid #0f2a1f' }}
                                onClick={handleGenerarPdfCotizacion}
                                disabled={cargando || ticket.length === 0}
                            >
                                {cargando ? 'Generando...' : 'Generar PDF'}
                            </button>
                            <button
                                className="pos-btn-pagar"
                                style={{ flex: 1 }}
                                onClick={handleConvertirCotizacionAVenta}
                                disabled={cargando || ticket.length === 0 || modoCliente === 'prospecto'}
                                title={modoCliente === 'prospecto' ? 'Solo disponible para clientes registrados' : ''}
                            >
                                {cargando ? 'Procesando...' : 'Convertir a Venta'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Modal de nuevo cliente */}
            {modalClienteAbierto && (
                <div className="modal-overlay" onClick={() => setModalClienteAbierto(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Registrar Nuevo Cliente</h2>
                            <button className="btn-close" onClick={() => setModalClienteAbierto(false)}>✕</button>
                        </div>

                        <form onSubmit={guardarNuevoCliente}>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Tipo Identificación</label>
                                    <select
                                        className="form-input"
                                        value={formCliente.tipoIdentificacionId}
                                        onChange={e => setFormCliente({ ...formCliente, tipoIdentificacionId: Number(e.target.value) })}
                                    >
                                        <option value="1">Cédula</option>
                                        <option value="2">RUC</option>
                                        <option value="3">Pasaporte</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Número de Identificación</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        required
                                        pattern="[0-9]+"
                                        title="Solo se permiten números"
                                        onKeyPress={(e) => {
                                            if (!/[0-9]/.test(e.key)) {
                                                e.preventDefault();
                                            }
                                        }}
                                        value={formCliente.identificacion}
                                        onChange={e => setFormCliente({ ...formCliente, identificacion: e.target.value })}
                                    />
                                </div>

                                <div className="form-group full-width">
                                    <label className="form-label">Nombre / Razón Social</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        required
                                        value={formCliente.razonSocial}
                                        onChange={e => setFormCliente({ ...formCliente, razonSocial: e.target.value })}
                                    />
                                </div>

                                <div className="form-group full-width">
                                    <label className="form-label">Dirección</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formCliente.direccion}
                                        onChange={e => setFormCliente({ ...formCliente, direccion: e.target.value })}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Teléfono</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formCliente.telefono}
                                        onChange={e => setFormCliente({ ...formCliente, telefono: e.target.value })}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Correo Electrónico</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        value={formCliente.correoElectronico}
                                        onChange={e => setFormCliente({ ...formCliente, correoElectronico: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn-cancelar" onClick={() => setModalClienteAbierto(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-guardar" disabled={guardandoCliente}>
                                    {guardandoCliente ? 'Guardando...' : 'Guardar Cliente'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {reciboData && (
                <ReciboVenta
                    {...reciboData}
                    onCerrar={() => setReciboData(null)}
                />
            )}

            {cotizacionPdfData && (
                <CotizacionPDF
                    {...cotizacionPdfData}
                    onCerrar={() => setCotizacionPdfData(null)}
                />
            )}

            {modoCamara && (
                <CameraScanner
                    onScan={(codigo) => {
                        setModoCamara(false);
                        buscarProductoPorCodigo(codigo);
                    }}
                    onClose={() => setModoCamara(false)}
                />
            )}
        </div>
    );
};

export default Ventas;