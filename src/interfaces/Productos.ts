

export interface Producto {
    id_producto: number;
    id_categoria?: number | null;
    id_unidad?: number | null;
    codigo_barras: string;
    nombre: string;
    precio_compra: number;
    precio_venta: number;
    stock_actual: number;
    stock_minimo?: number;
    estado: boolean;
    imagen?: string | null;
    codigo_impuesto_sri?: string | null;
}

