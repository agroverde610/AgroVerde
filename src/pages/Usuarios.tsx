import React, { useState, useEffect } from 'react';
import { LuSearch, LuTrash2, LuX, LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { FiEdit } from "react-icons/fi";
import api from '../services/api';
import '../App.css';

interface Usuario {
    id_usuario: number;
    id_rol: number;
    nombre_completo: string;
    username: string;
    correo: string;
    estado: boolean;
}

const Usuarios: React.FC = () => {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [cargando, setCargando] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [modalAbierto, setModalAbierto] = useState<boolean>(false);
    const [modoModal, setModoModal] = useState<'crear' | 'editar' | 'ver'>('crear');
    const [guardando, setGuardando] = useState<boolean>(false);

    const [busqueda, setBusqueda] = useState('');
    const [paginaActual, setPaginaActual] = useState(1);
    const elementosPorPagina = 20;

    const [formData, setFormData] = useState({
        idUsuario: 0,
        idRol: 2,
        nombreCompleto: '',
        username: '',
        password: '',
        correo: '',
        estado: true
    });

    useEffect(() => {
        obtenerUsuarios();
    }, []);

    useEffect(() => {
        setPaginaActual(1);
    }, [busqueda]);

    const obtenerUsuarios = async () => {
        try {
            setCargando(true);
            setError(null);
            const respuesta = await api.get('usuarios/obtener');
            if (respuesta.data.success) {
                setUsuarios(respuesta.data.data);
            }
        } catch (err: any) {
            setError(err.response?.data?.mensaje || 'Error al cargar los usuarios');
        } finally {
            setCargando(false);
        }
    };

    const abrirModalCrear = () => {
        setFormData({
            idUsuario: 0,
            idRol: 2,
            nombreCompleto: '',
            username: '',
            password: '',
            correo: '',
            estado: true
        });
        setModoModal('crear');
        setModalAbierto(true);
    };

    const abrirModalEditar = (usuario: Usuario) => {
        setFormData({
            idUsuario: usuario.id_usuario,
            idRol: usuario.id_rol || 2,
            nombreCompleto: usuario.nombre_completo,
            username: usuario.username,
            password: '',
            correo: usuario.correo,
            estado: usuario.estado
        });
        setModoModal('editar');
        setModalAbierto(true);
    };

    const abrirModalVer = (usuario: Usuario) => {
        setFormData({
            idUsuario: usuario.id_usuario,
            idRol: usuario.id_rol || 2,
            nombreCompleto: usuario.nombre_completo,
            username: usuario.username,
            password: '',
            correo: usuario.correo,
            estado: usuario.estado
        });
        setModoModal('ver');
        setModalAbierto(true);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData({ ...formData, [name]: checked });
        } else if (name === 'idRol') {
            setFormData({ ...formData, [name]: Number(value) });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleGuardar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (modoModal === 'ver') return;

        setGuardando(true);
        setError(null);

        try {
            if (modoModal === 'crear') {
                const respuesta = await api.post('usuarios/insertar', formData);
                if (respuesta.data.success) {
                    alert('¡Usuario registrado con éxito!');
                    setModalAbierto(false);
                    obtenerUsuarios();
                }
            } else if (modoModal === 'editar') {
                const respuesta = await api.put('usuarios/actualizar', formData);
                if (respuesta.data.success) {
                    alert('¡Usuario actualizado con éxito!');
                    setModalAbierto(false);
                    obtenerUsuarios();
                }
            }
        } catch (err: any) {
            alert(err.response?.data?.mensaje || 'Error al guardar el usuario');
        } finally {
            setGuardando(false);
        }
    };

    const handleEliminar = async (id: number, nombre: string) => {
        const confirmar = window.confirm(`¿Estás seguro de que deseas desactivar al usuario "${nombre}"?`);
        if (confirmar) {
            try {
                const respuesta = await api.delete(`usuarios/desactivar/${id}`);
                if (respuesta.data.success) {
                    alert('Usuario desactivado correctamente.');
                    obtenerUsuarios();
                }
            } catch (err: any) {
                alert(err.response?.data?.mensaje || 'Error al desactivar');
            }
        }
    };

    const usuariosFiltrados = usuarios.filter(user => {
        const termino = busqueda.toLowerCase();
        return (
            user.nombre_completo.toLowerCase().includes(termino) ||
            user.username.toLowerCase().includes(termino) ||
            user.correo.toLowerCase().includes(termino)
        );
    });

    const indiceUltimo = paginaActual * elementosPorPagina;
    const indicePrimer = indiceUltimo - elementosPorPagina;
    const usuariosActuales = usuariosFiltrados.slice(indicePrimer, indiceUltimo);
    const totalPaginas = Math.ceil(usuariosFiltrados.length / elementosPorPagina);

    const getNombreRol = (idRol: number) => {
        switch (idRol) {
            case 1: return 'Administrador';
            case 2: return 'Vendedor';
            case 3: return 'Inventario';
            default: return 'No asignado';
        }
    };

    return (
        <div className="clientes-wrapper">
            <div className="clientes-header">
                <h1 className="clientes-title">Gestión de Usuarios</h1>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="clientes-controls">
                <div className="control-box flex-grow">
                    <span className="control-label"> Búsqueda de Personal</span>
                    <div className="search-input-group">
                        <input
                            type="text"
                            placeholder="Buscar por nombre, usuario o correo..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                        <button className="btn"><LuSearch /></button>
                    </div>
                </div>

                <div className="control-box action-box">
                    <span className="control-label">Botón Destacado</span>
                    <button className="btn" onClick={abrirModalCrear}>
                        Nuevo Usuario
                    </button>
                </div>
            </div>

            <div className="table-container">
                {cargando ? (
                    <div className="text-center" style={{ padding: '20px' }}>Cargando usuarios...</div>
                ) : (
                    <>
                        <table className="clientes-table">
                            <thead>
                                <tr>
                                    <th>Nombre Completo</th>
                                    <th>Usuario (Login)</th>
                                    <th>Rol del Sistema</th>
                                    <th>Correo</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usuariosActuales.map((user) => (
                                    <tr key={user.id_usuario}>
                                        <td>
                                            <div className="client-name-cell">
                                                <img
                                                    src={`https://ui-avatars.com/api/?name=${user.nombre_completo.replace(/ /g, '+')}&background=random`}
                                                    alt={user.nombre_completo}
                                                    className="client-avatar"
                                                />
                                                {user.nombre_completo}
                                            </div>
                                        </td>
                                        <td><strong>{user.username}</strong></td>
                                        <td>
                                            <span style={{
                                                backgroundColor: user.id_rol === 1 ? '#dcfce7' : '#f3f4f6',
                                                color: user.id_rol === 1 ? '#16a34a' : '#4b5563',
                                                padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold'
                                            }}>
                                                {getNombreRol(user.id_rol)}
                                            </span>
                                        </td>
                                        <td>{user.correo}</td>
                                        <td>
                                            <label className="switch">
                                                <input type="checkbox" checked={user.estado} readOnly />
                                                <span className="slider round"></span>
                                            </label>
                                        </td>
                                        <td>
                                            <div className="actions-cell">
                                                <button className="btn-action-text" onClick={() => abrirModalVer(user)}>Ver</button>
                                                <button className="btn-icon edit" title="Editar" onClick={() => abrirModalEditar(user)}><FiEdit /></button>
                                                <button className="btn-icon delete" title="Desactivar" onClick={() => handleEliminar(user.id_usuario, user.nombre_completo)}><LuTrash2 /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {usuariosActuales.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="text-center" style={{ padding: '20px' }}>
                                            {busqueda === '' ? 'No hay usuarios registrados.' : 'No se encontraron resultados.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {usuariosFiltrados.length > 0 && (
                            <div className="pagination-container">
                                <span className="pagination-info">
                                    Mostrando {indicePrimer + 1} a {Math.min(indiceUltimo, usuariosFiltrados.length)} de {usuariosFiltrados.length}
                                </span>
                                <div className="pagination-buttons">
                                    <button className="btn-pagination" disabled={paginaActual === 1} onClick={() => setPaginaActual(paginaActual - 1)}>
                                        <LuChevronLeft /> Anterior
                                    </button>
                                    <span className="pagination-current">
                                        Página {paginaActual} de {totalPaginas}
                                    </span>
                                    <button className="btn-pagination" disabled={paginaActual === totalPaginas} onClick={() => setPaginaActual(paginaActual + 1)}>
                                        Siguiente <LuChevronRight />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* MODAL USUARIOS */}
            {modalAbierto && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>
                                {modoModal === 'crear' && 'Registrar Nuevo Usuario'}
                                {modoModal === 'editar' && 'Editar Usuario'}
                                {modoModal === 'ver' && 'Detalles del Usuario'}
                            </h2>
                            <button className="btn-close" onClick={() => setModalAbierto(false)}><LuX /></button>
                        </div>

                        <form onSubmit={handleGuardar}>
                            <div className="form-grid">

                                <div className="form-group full-width">
                                    <label className="form-label">Nombre Completo</label>
                                    <input type="text" className="form-input" name="nombreCompleto" required
                                        value={formData.nombreCompleto} onChange={handleChange} disabled={modoModal === 'ver'} />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Nombre de Usuario (Login)</label>
                                    <input type="text" className="form-input" name="username" required
                                        value={formData.username} onChange={handleChange} disabled={modoModal === 'ver'} />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Rol del Sistema</label>
                                    <select className="form-input" name="idRol" value={formData.idRol} onChange={handleChange} disabled={modoModal === 'ver'}>
                                        <option value={1}>Administrador</option>
                                        <option value={2}>Vendedor</option>
                                        <option value={3}>Encargado Inventario</option>
                                    </select>
                                </div>

                                <div className="form-group full-width">
                                    <label className="form-label">Correo Electrónico</label>
                                    <input type="email" className="form-input" name="correo" required
                                        value={formData.correo} onChange={handleChange} disabled={modoModal === 'ver'} />
                                </div>

                                {modoModal !== 'ver' && (
                                    <div className="form-group full-width">
                                        <label className="form-label">
                                            Contraseña {modoModal === 'editar' && <span style={{ color: '#9ca3af', fontWeight: 'normal' }}>(Dejar en blanco para mantener actual)</span>}
                                        </label>
                                        <input type="password" className="form-input" name="password"
                                            required={modoModal === 'crear'}
                                            value={formData.password} onChange={handleChange} />
                                    </div>
                                )}

                                {modoModal !== 'crear' && (
                                    <div className="form-group full-width" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <label className="form-label" style={{ marginBottom: 0 }}>Cuenta Activa:</label>
                                        <label className="switch">
                                            <input type="checkbox" name="estado" checked={formData.estado} onChange={handleChange} disabled={modoModal === 'ver'} />
                                            <span className="slider round"></span>
                                        </label>
                                    </div>
                                )}
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn-cancelar" onClick={() => setModalAbierto(false)}>
                                    {modoModal === 'ver' ? 'Cerrar' : 'Cancelar'}
                                </button>
                                {modoModal !== 'ver' && (
                                    <button type="submit" className="btn-guardar" disabled={guardando}>
                                        {guardando ? 'Guardando...' : (modoModal === 'crear' ? 'Crear Cuenta' : 'Actualizar Usuario')}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Usuarios;