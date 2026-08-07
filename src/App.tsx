import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Layout from "./pages/Layout";
import CambiarPasswordObligatorio from "./pages/CambiarPasswordObligatorio";
import Perfil from "./pages/Perfil";

import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Ventas from "./pages/Ventas";
import Usuarios from "./pages/Usuarios";
import Productos from "./pages/Productos";
import Categorias from "./pages/Categorias";
import Configuracion from "./pages/Configuracion";
import Proveedores from "./pages/Proveedores";
import Compras from "./pages/Compras";
import Alertas from "./pages/Alertas";
import Historial from "./pages/Historial";
import Reportes from "./pages/Reportes";
import Lotes from "./pages/Lotes";
import Marca from "./pages/Marca";
import Promociones from "./pages/Promociones";
import InventarioFisico from "./pages/Inventariofisico";
import ReporteMermas from "./pages/Reportemermas";
import Caja from "./pages/Caja";
function App() {
    return (
        <HashRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/cambiar-password-obligatorio" element={<CambiarPasswordObligatorio />} />

                <Route element={<Layout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/ventas" element={<Ventas />} />
                    <Route path="/inventario" element={<Productos />} />
                    <Route path="/inventario/categorias" element={<Categorias />} />
                    <Route path="/inventario/productos" element={<Productos />} />
                    <Route path="/inventario/lotes" element={<Lotes />} />
                    <Route path="/inventario/marca" element={<Marca />} />
                    <Route path="/inventario/promociones" element={<Promociones />} />
                    <Route path="/clientes" element={<Clientes />} />
                    <Route path="/proveedores" element={<Proveedores />} />
                    <Route path="/compras" element={<Compras />} />
                    <Route path="/caja" element={<Caja />} />
                    {/*<Route path="/herramientas" element={<Herramientas />} />*/}
                    {/*<Route path="/usuarios" element={<Usuarios />} />*/}
                    <Route path="/reportes" element={<Reportes />} />
                    <Route path="/configuracion/general" element={<Configuracion />} />
                    <Route path="/configuracion/usuarios" element={<Usuarios />} />
                    <Route path="/alertas" element={<Alertas />} />
                    <Route path="/historial" element={<Historial />} />
                    <Route path="/inventario/fisico" element={<InventarioFisico />} />
                    <Route path="/inventario/reporte-mermas" element={<ReporteMermas />} />
                    <Route path="/perfil" element={<Perfil />} />
                    
                </Route>
            </Routes>
        </HashRouter>
    );
}

export default App;