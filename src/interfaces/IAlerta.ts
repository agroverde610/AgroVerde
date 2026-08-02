export interface LoteProximoVencer {
    idLote: number;
    producto: string;
    codigoLote: string;
    fechaVencimiento: string;
    stockRestante: number;
    diasRestantes: number;
}

export interface StockBajo {
    idProducto: number;
    nombre: string;
    stockActual: number;
    stockMinimo: number;
    cantidadFaltante: number;
}