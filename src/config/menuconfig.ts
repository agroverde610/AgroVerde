import type { IconType } from "react-icons";
import { LuLayoutDashboard, LuShoppingCart, LuPackage, LuUsers, LuSettings, LuChartBar, LuUserRound, LuBox, LuClipboardList, LuBell, LuStore, LuTicket } from "react-icons/lu";
import { MdOutlineProductionQuantityLimits } from "react-icons/md";
import { TbBrandBumble } from "react-icons/tb";
import { IoLogoBuffer } from "react-icons/io";
import { BiCategory } from "react-icons/bi";
import { LuHistory } from "react-icons/lu"; 


export interface OpcionMenu {
    etiqueta: string;
    ruta: string;
    icono: IconType;
    roles: string[];
    subItems?: { icono: IconType,etiqueta: string; ruta: string }[];
}

export const opcionesMenu: OpcionMenu[] = [
    {
        etiqueta: "Dashboard",
        ruta: "/dashboard",
        icono: LuLayoutDashboard,
        roles: ["Administrador", "Vendedor", "EncargadoInventario"]
    },
    {
        etiqueta: "Punto de Venta",
        ruta: "/ventas",
        icono: LuShoppingCart,
        roles: ["Administrador", "Vendedor"]
    },
    
    {
        etiqueta: "Inventario General",
        ruta: "/inventario",
        icono: LuPackage,
        roles: ["Administrador", "Vendedor", "EncargadoInventario"],
        subItems: [
            { icono: BiCategory, etiqueta: "Lista de Categorías", ruta: "/inventario/categorias" },
            { icono: MdOutlineProductionQuantityLimits, etiqueta: "Lista de Productos", ruta: "/inventario/productos" },
            { icono: IoLogoBuffer, etiqueta: "Lista de Lotes", ruta: "/inventario/lotes" },
            { icono: TbBrandBumble, etiqueta: "Lista de Marcas", ruta: "/inventario/marca" },
            { icono: LuTicket, etiqueta: "Promociones", ruta: "/inventario/promociones" }
        ]
    },
  
    {
        etiqueta: "Clientes",
        ruta: "/clientes",
        icono: LuUserRound,
        roles: ["Administrador", "Vendedor"]
    },
    {
        etiqueta: "Proveedores",
        ruta: "/proveedores",
        icono: LuBox,
        roles: ["Administrador", "EncargadoInventario"]
    },
    {
        etiqueta: "Compras",
        ruta: "/compras",
        icono: LuClipboardList,
        roles: ["Administrador", "EncargadoInventario"]
    },
    // {
    //     etiqueta: "Herramientas",
    //     ruta: "/herramientas",
    //     icono: LuWrench,
    //     roles: ["Administrador"]
    // },
    // {
    //     etiqueta: "Usuarios",
    //     ruta: "/usuarios",
    //     icono: LuUsers,
    //     roles: ["Administrador"]
    // },
    {
        etiqueta: "Alertas",
        ruta: "/alertas",
        icono: LuBell,
        roles: ["Administrador", "EncargadoInventario"]
    },
    {
        etiqueta: "Historial",
        ruta: "/historial",
        icono: LuHistory,
        roles: ["Administrador", "Vendedor", "EncargadoInventario"]
    },

    {
        etiqueta: "Reportes",
        ruta: "/reportes",
        icono: LuChartBar,
        roles: ["Administrador"]
    },
    {
        etiqueta: "Configuración",
        ruta: "/configuracion",
        icono: LuSettings,
        roles: ["Administrador"],
        subItems: [
            { icono: LuStore, etiqueta: "General", ruta: "/configuracion/general" },
            { icono: LuUsers, etiqueta: "Usuarios", ruta: "/configuracion/usuarios" }
        ]
    },
];