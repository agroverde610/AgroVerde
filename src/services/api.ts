import axios from 'axios';
import type {
    RegistrarCompraRequest,
    AgregarDetalleCompraRequest,
    RecibirLoteRequest
} from '../interfaces/ICompra';

// Si existe la variable de entorno VITE_API_URL (definida en tu archivo
// .env.development.local, que NO se sube a git), se usa esa — eso pasa solo en
// npm run dev. Si no existe (como en npm run build / npm run deploy), cae en la
// URL de producción de Azure por defecto.
const API_URL = 'https://agroverde-e9gdg9hbc8a2ctgc.mexicocentral-01.azurewebsites.net/api';

// Origen del backend sin el sufijo "/api", para armar URLs de recursos estáticos
// (imágenes de productos, etc.) que sirve el mismo backend.
export const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

const api = axios.create({
    baseURL: API_URL

    // Ya NO forzamos 'Content-Type': 'application/json' aquí.
    // Axios ya pone 'application/json' automático cuando mandas un objeto normal,
    // y 'multipart/form-data; boundary=...' automático cuando mandas un FormData
    // (como en Productos/Agregar, que incluye la imagen) — pero solo si NO
    // le forzamos un header fijo que lo pise, como pasaba antes.
});

// Interceptor: agrega el token JWT en cada petición
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ---------- Compras ----------
export const registrarCompra = async (data: RegistrarCompraRequest) => {
    const res = await api.post('/Compras', data);
    return res.data;
};

export const agregarDetalleCompra = async (data: AgregarDetalleCompraRequest) => {
    const res = await api.post('/Compras/detalle', data);
    return res.data;
};

export const recibirLote = async (data: RecibirLoteRequest) => {
    const res = await api.post('/Compras/recibir-lote', data);
    return res.data;
};

export const finalizarCompra = async (compraId: number) => {
    const res = await api.post(`/Compras/${compraId}/finalizar`);
    return res.data;
};

import type { LoteProximoVencer, StockBajo } from '../interfaces/IAlerta';

// ---------- Alertas ----------
export const getLotesProximosAVencer = async (dias: number = 30) => {
    const res = await api.get<{ success: boolean; mensaje?: string; data: LoteProximoVencer[] }>(
        `/Alertas/proximos-vencer?dias=${dias}`
    );
    return res.data;
};

export const getStockBajo = async () => {
    const res = await api.get<{ success: boolean; mensaje?: string; data: StockBajo[] }>(
        '/Alertas/stock-bajo'
    );
    return res.data;
};
import type {
    CompraHistorial, DetalleCompraHistorial,
    VentaHistorial, DetalleVentaHistorial
} from '../interfaces/IHistorial';

// ---------- Historial ----------
export const getHistorialCompras = async (fechaDesde?: string, fechaHasta?: string) => {
    const params = new URLSearchParams();
    if (fechaDesde) params.append('fechaDesde', fechaDesde);
    if (fechaHasta) params.append('fechaHasta', fechaHasta);
    const res = await api.get<{ success: boolean; mensaje?: string; data: CompraHistorial[] }>(
        `/Historial/Compras?${params.toString()}`
    );
    return res.data;
};

export const getDetalleCompra = async (compraId: number) => {
    const res = await api.get<{ success: boolean; mensaje?: string; data: DetalleCompraHistorial[] }>(
        `/Historial/Compras/${compraId}/Detalle`
    );
    return res.data;
};

export const getHistorialVentas = async (fechaDesde?: string, fechaHasta?: string, soloAnuladas?: boolean) => {
    const params = new URLSearchParams();
    if (fechaDesde) params.append('fechaDesde', fechaDesde);
    if (fechaHasta) params.append('fechaHasta', fechaHasta);
    if (soloAnuladas) params.append('soloAnuladas', 'true');
    const res = await api.get<{ success: boolean; mensaje?: string; data: VentaHistorial[] }>(
        `/Historial/Ventas?${params.toString()}`
    );
    return res.data;
};

export const anularVenta = async (idVenta: number, motivo: string, idUsuario?: number) => {
    const res = await api.post(`/Ventas/${idVenta}/anular`, { motivo, idUsuario });
    return res.data;
};

export const anularCompra = async (compraId: number, motivo: string, idUsuario?: number) => {
    const res = await api.post(`/Compras/${compraId}/anular`, { motivo, idUsuario });
    return res.data;
};

export const getDetalleVenta = async (idVenta: number) => {
    const res = await api.get<{ success: boolean; mensaje?: string; data: DetalleVentaHistorial[] }>(
        `/Historial/Ventas/${idVenta}/Detalle`
    );
    return res.data;
};
import type { MermaLote, UtilidadProducto } from '../interfaces/IReporte';

export const getReporteMermas = async (fechaDesde?: string, fechaHasta?: string) => {
    const params = new URLSearchParams();
    if (fechaDesde) params.append('fechaDesde', fechaDesde);
    if (fechaHasta) params.append('fechaHasta', fechaHasta);
    const res = await api.get<{ success: boolean; mensaje?: string; data: MermaLote[] }>(
        `/Reportes/Mermas?${params.toString()}`
    );
    return res.data;
};

export const getReporteUtilidad = async (fechaDesde?: string, fechaHasta?: string) => {
    const params = new URLSearchParams();
    if (fechaDesde) params.append('fechaDesde', fechaDesde);
    if (fechaHasta) params.append('fechaHasta', fechaHasta);
    const res = await api.get<{ success: boolean; mensaje?: string; data: UtilidadProducto[] }>(
        `/Reportes/UtilidadPorProducto?${params.toString()}`
    );
    return res.data;
};
export const getReporteVentasPeriodo = async (fechaDesde?: string, fechaHasta?: string, formaPago?: string) => {
    const res = await api.get('Reportes/VentasPorPeriodo', {
        params: { fechaDesde, fechaHasta, formaPago }
    });
    return res.data;
};

export const getReporteProductosMasVendidos = async (fechaDesde?: string, fechaHasta?: string, idCategoria?: number, top?: number) => {
    const res = await api.get('Reportes/ProductosMasVendidos', {
        params: { fechaDesde, fechaHasta, idCategoria, top }
    });
    return res.data;
};

export const getReporteMovimientosUsuario = async (fechaDesde?: string, fechaHasta?: string) => {
    const res = await api.get('Reportes/MovimientosUsuario', {
        params: { fechaDesde, fechaHasta }
    });
    return res.data;
};

export default api;