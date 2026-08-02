import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { opcionesMenu } from "../config/menuconfig.ts";
import { type UsuarioLogueado } from "../interfaces/auth";
import { LuLogOut, LuChevronRight } from "react-icons/lu";
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

    const [menuExpandido, setMenuExpandido] = useState<string | null>(null);
    const [sidebarHover, setSidebarHover] = useState(false);
    // El sidebar se mantiene expandido si el mouse está sobre él, o si hay un
    // submenú abierto (aunque el mouse ya esté sobre el submenú flotante, que
    // vive fuera del árbol del sidebar gracias al portal)
    const sidebarExpandido = sidebarHover || menuExpandido !== null;
    const [submenuPos, setSubmenuPos] = useState<{ top: number; left: number } | null>(null);
    const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const cierreTimeout = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (cierreTimeout.current) window.clearTimeout(cierreTimeout.current);
        };
    }, []);

    const cancelarCierre = () => {
        if (cierreTimeout.current) {
            window.clearTimeout(cierreTimeout.current);
            cierreTimeout.current = null;
        }
    };

    const abrirSubmenu = (ruta: string) => {
        cancelarCierre();
        const el = itemRefs.current[ruta];
        if (el) {
            const rect = el.getBoundingClientRect();
            // Usamos siempre 230 (el ancho expandido del sidebar) en vez del rect.right,
            // porque al momento de medir, el sidebar todavía puede estar en su ancho
            // colapsado (70px) ya que la transición CSS no ha terminado.
            setSubmenuPos({ top: rect.top, left: 230 });
        }
        setMenuExpandido(ruta);
    };

    const programarCierre = () => {
        cancelarCierre();
        cierreTimeout.current = window.setTimeout(() => {
            setMenuExpandido(null);
            setSubmenuPos(null);
        }, 200);
    };

    const cerrarSubmenu = () => {
        cancelarCierre();
        setMenuExpandido(null);
        setSubmenuPos(null);
        // Al seleccionar una opción del submenú, el mouse queda sobre el
        // submenú (fuera del área del sidebar principal), así que forzamos
        // que el sidebar se colapse también, en vez de esperar un mouseleave
        // que ya no va a ocurrir sobre el propio sidebar.
        setSidebarHover(false);
    };

    return (
        <div
            className={`sidebar${sidebarExpandido ? " expanded" : ""}`}
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
                    const esPadreActivo =
                        !!item.subItems &&
                        (location.pathname === item.ruta ||
                            item.subItems.some((sub) => location.pathname.startsWith(sub.ruta)));

                    return (
                        <div
                            key={item.ruta}
                            className="nav-item-wrapper"
                            onMouseLeave={programarCierre}
                        >
                            {item.subItems ? (
                                <div
                                    ref={(el) => { itemRefs.current[item.ruta] = el; }}
                                    className={`sidebar-link${esPadreActivo ? " active" : ""}`}
                                    onMouseEnter={() => abrirSubmenu(item.ruta)}
                                >
                                    <Icono size={18} />
                                    <span>{item.etiqueta}</span>
                                    <LuChevronRight size={16} style={{ marginLeft: "auto" }} />
                                </div>
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

                            {item.subItems && menuExpandido === item.ruta && submenuPos &&
                                createPortal(
                                    <div
                                        className="sidebar-submenu sidebar-submenu-portal"
                                        style={{ top: submenuPos.top, left: submenuPos.left }}
                                        onMouseEnter={cancelarCierre}
                                        onMouseLeave={programarCierre}
                                    >
                                        {item.subItems.map((sub) => {
                                            const IconoSub = sub.icono;
                                            return (
                                                <NavLink
                                                    key={sub.ruta}
                                                    to={sub.ruta}
                                                    className={({ isActive }) =>
                                                        `sidebar-link sub-link${isActive ? " active" : ""}`
                                                    }
                                                    onClick={cerrarSubmenu}
                                                >
                                                    {IconoSub && <IconoSub size={18} />}
                                                    <span>{sub.etiqueta}</span>
                                                </NavLink>
                                            );
                                        })}
                                    </div>,
                                    document.body
                                )
                            }
                        </div>
                    );
                })}
            </nav>

            <div className="sidebar-footer">
                {usuario && (
                    <p className="sidebar-user-name">
                        {usuario.nombre} <br />
                        <span className="sidebar-user-rol">{usuario.rol}</span>
                    </p>
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