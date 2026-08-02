import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Layout from "./pages/Layout";


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

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />

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
                    {/*<Route path="/herramientas" element={<Herramientas />} />*/}
                    {/*<Route path="/usuarios" element={<Usuarios />} />*/}
                    <Route path="/reportes" element={<Reportes />} />
                    <Route path="/configuracion/general" element={<Configuracion />} />
                    <Route path="/configuracion/usuarios" element={<Usuarios />} />
                    <Route path="/alertas" element={<Alertas />} />
                    <Route path="/historial" element={<Historial />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;