export interface CompraHistorial {
    compraId: number;
    numeroFactura: string;
    fechaCompra: string;
    proveedor: string;
    subtotal: number;
    iva: number;
    total: number;
    estado: string;
    observaciones?: string;
}

export interface DetalleCompraHistorial {
    compraDetalleId: number;
    producto: string;
    cantidad: number;
    costoUnitario: number;
    subtotal: number;
    codigoLote?: string;
    fechaElaboracion?: string;
    fechaVencimiento?: string;
    cantidadInicial?: number;
    stockRestante?: number;
}

export interface VentaHistorial {
    idVenta: number;
    fechaEmision: string;
    cliente: string;
    identificacionCliente?: string;
    emailCliente?: string;
    subtotalIva0: number;
    subtotalIva15: number;
    montoIva: number;
    total: number;
    formaPago: string;
    estadoSri: string;
    motivoAnulacion?: string;
    fechaAnulacion?: string;
}

export interface DetalleVentaHistorial {
    idDetalle: number;
    producto: string;
    cantidad: number;
    precioUnitario: number;
    porcentajeIva: number;
    descuento: number;
    subtotal: number;
    codigoLote?: string;
    fechaVencimiento?: string;
}