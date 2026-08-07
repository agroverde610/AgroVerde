import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { opcionesMenu } from "../config/menuconfig.ts";
import { type UsuarioLogueado } from "../interfaces/auth";
import { LuLogOut, LuChevronDown, LuUserRound } from "react-icons/lu";
import logoAgroVerde from "../assets/logo-agroverde.png";
import "../App.css";

const Sidebar: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const usuarioGuardado = localStorage.getItem("usuario");
    const usuario: UsuarioLogueado | null = usuarioGuardado ? JSON.parse(usuarioGuardado) : null;

    const itemsPermitidos = opcionesMenu.filter((item) =>
        usuario ? item.roles.includes(usuario.rol) : false
    );

    const handleLogout = () => {
        localStorage.removeItem("usuario");
        navigate("/login");
    };

    // Ruta del menú actualmente expandido como acordeón (null = ninguno abierto).
    // Antes esto controlaba un submenú flotante (portal) que aparecía a la derecha
    // con el mouse encima; ahora solo abre/cierra el bloque de abajo con un clic.
    const [menuExpandido, setMenuExpandido] = useState<string | null>(null);
    const [sidebarHover, setSidebarHover] = useState(false);

    const toggleSubmenu = (ruta: string) => {
        setMenuExpandido(prev => (prev === ruta ? null : ruta));
    };

    return (
        <div
            className={`sidebar${sidebarHover ? " expanded" : ""}`}
            onMouseEnter={() => setSidebarHover(true)}
            onMouseLeave={() => setSidebarHover(false)}
        >
            <div className="sidebar-logo" style={{ flexDirection: "column", alignItems: "center", gap: 6, padding: "16px 8px 4px" }}>
                <img
                    src={logoAgroVerde}
                    alt="Agro Verde"
                    style={{ width: "100%", maxWidth: 200, height: "auto", objectFit: "contain", flexShrink: 0 }}
                />
                <span className="sidebar-logo-text" style={{ fontSize: 15, textAlign: "center", lineHeight: 1.2 }}>AGRO VERDE</span>
            </div>

            <nav className="sidebar-nav" style={{ marginTop: 0 }}>
                {itemsPermitidos.map((item) => {
                    const Icono = item.icono;
                    const estaAbierto = menuExpandido === item.ruta;
                    const esPadreActivo =
                        !!item.subItems &&
                        (location.pathname === item.ruta ||
                            item.subItems.some((sub) => location.pathname.startsWith(sub.ruta)));

                    return (
                        <div key={item.ruta} className="nav-item-wrapper">
                            {item.subItems ? (
                                <button
                                    type="button"
                                    className={`sidebar-link${esPadreActivo ? " active" : ""}`}
                                    onClick={() => toggleSubmenu(item.ruta)}
                                    style={{ width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                                >
                                    <Icono size={18} />
                                    <span>{item.etiqueta}</span>
                                    <LuChevronDown
                                        size={16}
                                        style={{
                                            marginLeft: "auto",
                                            transition: "transform 0.15s ease",
                                            transform: estaAbierto ? "rotate(180deg)" : "rotate(0deg)"
                                        }}
                                    />
                                </button>
                            ) : (
                                <NavLink
                                    to={item.ruta}
                                    className={({ isActive }) =>
                                        `sidebar-link${isActive ? " active" : ""}`
                                    }
                                >
                                    <Icono size={18} />
                                    <span>{item.etiqueta}</span>
                                </NavLink>
                            )}

                            {/* Submenú tipo acordeón: se expande justo debajo del padre,
                                dentro del mismo flujo del sidebar (ya no es un portal flotante). */}
                            {item.subItems && estaAbierto && (
                                <div className="sidebar-submenu-acordeon">
                                    {item.subItems.map((sub) => {
                                        const IconoSub = sub.icono;
                                        return (
                                            <NavLink
                                                key={sub.ruta}
                                                to={sub.ruta}
                                                className={({ isActive }) =>
                                                    `sidebar-link sub-link${isActive ? " active" : ""}`
                                                }
                                            >
                                                {IconoSub && <IconoSub size={16} />}
                                                <span>{sub.etiqueta}</span>
                                            </NavLink>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            <div className="sidebar-footer">
                {usuario && (
                    <NavLink
                        to="/perfil"
                        className={({ isActive }) => `sidebar-user-link${isActive ? " active" : ""}`}
                        style={{
                            display: "flex", alignItems: "center", gap: 8, padding: "6px 4px",
                            marginBottom: 8, textDecoration: "none", color: "inherit", borderRadius: 6,
                        }}
                        title="Ver mi perfil"
                    >
                        <LuUserRound size={18} style={{ flexShrink: 0 }} />
                        <p className="sidebar-user-name" style={{ margin: 0 }}>
                            {usuario.nombre} <br />
                            <span className="sidebar-user-rol">{usuario.rol}</span>
                        </p>
                    </NavLink>
                )}
                <button onClick={handleLogout} className="sidebar-logout-btn">
                    <LuLogOut size={18} />
                    <span>Cerrar Sesión</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;