export interface RegistrarCompraRequest {
    proveedorId: number;
    numeroFactura: string;
    usuarioId: number;
    observaciones?: string;
}

export interface AgregarDetalleCompraRequest {
    compraId: number;
    productoId: number;
    cantidad: number;
    costoUnitario: number;
}

export interface RecibirLoteRequest {
    compraDetalleId: number;
    codigoLote: string;
    fechaVencimiento: string;
    cantidadRecibida: number;
}