export interface MermaLote {
    idLote: number;
    producto: string;
    codigoLote: string;
    fechaVencimiento: string;
    stockRestante: number;
    precioCompra: number;
    valorPerdida: number;
}

export interface UtilidadProducto {
    idProducto: number;
    producto: string;
    cantidadVendida: number;
    totalVentas: number;
    costoTotal: number;
    utilidad: number;
    margenPorcentaje: number;
}
export interface MovimientoUsuario {
    idUsuario: number;
    usuario: string;
    tipoMovimiento: 'Venta' | 'Anulación';
    fecha: string;
    idVenta: number;
    cliente: string | null;
    total: number;
    detalle: string | null;
}

export interface VentaPorDia {
    fecha: string;
    cantidadVentas: number;
    totalVentas: number;
    ticketPromedio: number;
}

export interface ResumenVentasPeriodo {
    totalActual: number;
    totalAnterior: number;
    variacionPorcentaje: number | null;
    cantidadVentas: number;
    ticketPromedio: number;
}

export interface ReporteVentasPeriodo {
    dias: VentaPorDia[];
    resumen: ResumenVentasPeriodo;
}

export interface ProductoMasVendido {
    idProducto: number;
    producto: string;
    idCategoria: number | null;
    categoria: string | null;
    cantidadVendida: number;
    totalVentas: number;
}