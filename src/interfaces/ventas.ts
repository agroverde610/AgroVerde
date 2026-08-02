export interface Categoria {
    idCategoria: number;
    nombre: string;
    descripcion: string;
}

export interface Producto {
    idProducto: number;
    nombre: string;
    precioVenta: number;
    codigoBarras: string;
    stockActual: number;
    codigoImpuestoSri: string;
    idCategoria: number;
    categoria: string;
    permiteDecimales?: boolean;
    idPromocion?: number | null;
    promocionNombre?: string | null;
    valorDescuento?: number | null;
    precioConDescuento?: number | null;
    fechaVencimiento?: string | null;
    diasRestantes?: number | null;
}


export interface ItemTicket {
    idProducto: number;
    nombre: string;
    precioUnitario: number;
    cantidad: number;
    porcentajeIva: number;
    descuento: number;
    subtotal: number;
    permiteDecimales?: boolean;
}
export interface VentaRequest {
    idCliente: number;
    idUsuario: number;
    subtotalIva0: number;
    subtotalIva15: number;
    montoIva: number;
    total: number;
    formaPago: string;
    detalle: {
        idProducto: number;
        cantidad: number;
        precioUnitario: number;
        porcentajeIva: number;
        descuento: number;
        subtotal: number;
    }[];
}
export interface Cliente {
    idCliente: number;
    razonSocial: string;
    identificacion: string;
    telefono: string;
    email?: string;
}