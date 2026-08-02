// Tus productos NO se registran por unidad de peso individual (no existe un
// producto "duplicado" para quintal/libra/arroba) — se registran una sola vez,
// con stockActual en "unidades" genéricas.
//
// Dentro de las categorías Semillas y Abonos, esa "unidad" SIEMPRE representa
// 1 quintal completo (100 lb) — así lo confirmaste. Otras categorías (fertilizantes
// líquidos, fungicidas, etc.) también usan "unidad" pero significa un frasco/envase
// individual, no un quintal — por eso la conversión se activa por CATEGORÍA,
// no por el campo idUnidad del producto (que no distingue entre ambos casos).
//
// Ajusta estos IDs si no coinciden exactamente con tu tabla Categorias.
export const ID_CATEGORIA_SEMILLAS = 1;
export const ID_CATEGORIA_ABONOS = 12;

const CATEGORIAS_VENTA_POR_PESO = new Set([ID_CATEGORIA_SEMILLAS, ID_CATEGORIA_ABONOS]);

// Cuántas libras representa 1 "unidad" de stock en estas categorías.
export const LIBRAS_POR_UNIDAD_DE_STOCK = 100; // 1 unidad = 1 quintal = 100 lb

export interface OpcionUnidadPeso {
    id: string;
    label: string;
    factorALibras: number;
}

// "Arroba" es solo una conveniencia de captura (25 lb) — no es una unidad de
// stock real, solo ayuda a escribir la cantidad de forma más natural.
export const OPCIONES_UNIDAD_PESO: OpcionUnidadPeso[] = [
    { id: 'lb', label: 'Libra', factorALibras: 1 },
    { id: 'arroba', label: 'Arroba (25 lb)', factorALibras: 25 },
    { id: 'qq', label: 'Quintal (100 lb)', factorALibras: 100 },
];

function factorDe(unidadId: string): number {
    return OPCIONES_UNIDAD_PESO.find(u => u.id === unidadId)?.factorALibras ?? 1;
}

// Decide si un producto entra en el selector de conversión, según su categoría.
export function categoriaVendePorPeso(idCategoria: number | null | undefined): boolean {
    return idCategoria != null && CATEGORIAS_VENTA_POR_PESO.has(idCategoria);
}

// Convierte lo que el usuario escribió (en lb/arroba/qq) a "unidades de stock"
// — que es lo que tu stockActual y tu cálculo de subtotal ya entienden.
// Ej.: escribe "20" + "Libra" -> devuelve 0.20 (unidades de stock, o sea 0.20 quintales).
export function convertirAUnidadesDeStock(cantidadIngresada: number, unidadIngresadaId: string): number {
    const enLibras = cantidadIngresada * factorDe(unidadIngresadaId);
    return enLibras / LIBRAS_POR_UNIDAD_DE_STOCK;
}