import React, { useState, useEffect } from 'react';
import { LuSearch,  LuTrash2, LuX, LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { FiEdit } from "react-icons/fi";
import api from '../services/api';
import '../App.css';

interface Cliente {
    id_cliente: number;
    tipo_identificacionId: number;
    identificacion: string;
    razon_social: string;
    direccion: string;
    telefono: string;
    correo_electronico: string;
    estado: boolean;
}

const Clientes: React.FC = () => {
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [cargando, setCargando] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [modalAbierto, setModalAbierto] = useState<boolean>(false);
    const [modoModal, setModoModal] = useState<'crear' | 'editar' | 'ver'>('crear');
    const [guardando, setGuardando] = useState<boolean>(false);

    const [busqueda, setBusqueda] = useState('');

    const [paginaActual, setPaginaActual] = useState(1);
    const elementosPorPagina = 10;

    const [formData, setFormData] = useState({
        idCliente: 0,
        tipoIdentificacionId: 1,
        identificacion: '',
        razonSocial: '',
        direccion: '',
        telefono: '',
        correoElectronico: '',
        estado: true
    });

    useEffect(() => {
        obtenerClientes();
    }, []);

    useEffect(() => {
        setPaginaActual(1);
    }, [busqueda]);

    const obtenerClientes = async () => {
        try {
            setCargando(true);
            setError(null);
            const respuesta = await api.get('clientes/obtener');
            if (respuesta.data.success) {
                setClientes(respuesta.data.data);
            }
        } catch (err: any) {
            setError(err.response?.data?.mensaje || 'Error de conexión al cargar los clientes');
        } finally {
            setCargando(false);
        }
    };

    const abrirModalCrear = () => {
        setFormData({
            idCliente: 0,
            tipoIdentificacionId: 1,
            identificacion: '',
            razonSocial: '',
            direccion: '',
            telefono: '',
            correoElectronico: '',
            estado: true
        });
        setModoModal('crear');
        setModalAbierto(true);
    };

    const abrirModalEditar = (cliente: Cliente) => {
        setFormData({
            idCliente: cliente.id_cliente,
            tipoIdentificacionId: cliente.tipo_identificacionId || 1, 
            identificacion: cliente.identificacion,
            razonSocial: cliente.razon_social,
            direccion: cliente.direccion || '',
            telefono: cliente.telefono || '',
            correoElectronico: cliente.correo_electronico || '',
            estado: cliente.estado
        });
        setModoModal('editar');
        setModalAbierto(true);
    };

    const abrirModalVer = (cliente: Cliente) => {
        setFormData({
            idCliente: cliente.id_cliente,
            tipoIdentificacionId: cliente.tipo_identificacionId || 1,
            identificacion: cliente.identificacion,
            razonSocial: cliente.razon_social,
            direccion: cliente.direccion || '',
            telefono: cliente.telefono || '',
            correoElectronico: cliente.correo_electronico || '',
            estado: cliente.estado
        });
        setModoModal('ver');
        setModalAbierto(true);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData({ ...formData, [name]: checked });
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
                const respuesta = await api.post('clientes/insertar', formData);
                if (respuesta.data.success) {
                    alert('¡Cliente registrado con éxito!');
                    setModalAbierto(false);
                    obtenerClientes();
                }
            } else if (modoModal === 'editar') {
                const respuesta = await api.put('clientes/actualizar', formData);
                if (respuesta.data.success) {
                    alert('¡Cliente actualizado con éxito!');
                    setModalAbierto(false);
                    obtenerClientes();
                }
            }
        } catch (err: any) {
            alert(err.response?.data?.mensaje || 'Error al guardar el cliente');
        } finally {
            setGuardando(false);
        }
    };

    const handleEliminar = async (id: number, nombre: string) => {
        const confirmar = window.confirm(`¿Estás seguro de que deseas desactivar al cliente "${nombre}"?\nEsta acción no borrará su historial de compras.`);

        if (confirmar) {
            try {
                const respuesta = await api.delete(`clientes/desactivar/${id}`);
                if (respuesta.data.success) {
                    alert('Cliente desactivado correctamente.');
                    obtenerClientes();
                }
            } catch (err: any) {
                alert(err.response?.data?.mensaje || 'Error al desactivar el cliente');
            }
        }
    };

    const clientesFiltrados = clientes.filter(cliente => {
        const termino = busqueda.toLowerCase();
        return (
            cliente.identificacion.toLowerCase().includes(termino) ||
            cliente.razon_social.toLowerCase().includes(termino) ||
            (cliente.correo_electronico && cliente.correo_electronico.toLowerCase().includes(termino))
        );
    });

    const indiceUltimoElemento = paginaActual * elementosPorPagina;
    const indicePrimerElemento = indiceUltimoElemento - elementosPorPagina;

    const clientesActuales = clientesFiltrados.slice(indicePrimerElemento, indiceUltimoElemento);

    const totalPaginas = Math.ceil(clientesFiltrados.length / elementosPorPagina);

    return (
        <div className="clientes-wrapper">
            <div className="clientes-header">
                <h1 className="clientes-title">Gestión de Clientes (Agricultores)</h1>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="clientes-controls">
                <div className="control-box flex-grow">
                    <span className="control-label"> Búsqueda Inteligente</span>
                    <div className="search-input-group">
                        <input
                            type="text"
                            placeholder="Buscar por Cédula, Nombre o RUC..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                        <button className="btn"><LuSearch /></button>
                    </div>
                </div>

                <div className="control-box action-box">
                    <span className="control-label">Botón Destacado</span>
                    <button className="btn" onClick={abrirModalCrear}>
                        Nuevo Cliente
                    </button>
                </div>
            </div>

            <div className="table-container">
                {cargando ? (
                    <div className="text-center" style={{ padding: '20px' }}>Cargando clientes...</div>
                ) : (
                    <>
                        <table className="clientes-table">
                            <thead>
                                <tr>
                                    <th>Identificación</th>
                                    <th>Razón Social</th>
                                    <th>Dirección</th>
                                    <th>Teléfono</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clientesActuales.map((cliente) => (
                                    <tr key={cliente.id_cliente}>
                                        <td>{cliente.identificacion}</td>
                                        <td>
                                            <div className="client-name-cell">
                                                <img
                                                    src={`https://ui-avatars.com/api/?name=${cliente.razon_social.replace(/ /g, '+')}&background=random`}
                                                    alt={cliente.razon_social}
                                                    className="client-avatar"
                                                />
                                                {cliente.razon_social}
                                            </div>
                                        </td>
                                        <td>{cliente.direccion || 'N/A'}</td>
                                        <td>{cliente.telefono || 'N/A'}</td>
                                        <td>
                                            <label className="switch">
                                                <input type="checkbox" checked={cliente.estado} readOnly />
                                                <span className="slider round"></span>
                                            </label>
                                        </td>
                                        <td>
                                            <div className="actions-cell">
                                                <button className="btn-action-text" onClick={() => abrirModalVer(cliente)}>
                                                    Ver
                                                </button>
                                                <button className="btn-icon edit" title="Editar" onClick={() => abrirModalEditar(cliente)}>
                                                    <FiEdit />
                                                </button>
                                                <button className="btn-icon delete" title="Desactivar" onClick={() => handleEliminar(cliente.id_cliente, cliente.razon_social)}>
                                                    <LuTrash2 />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {clientesActuales.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="text-center" style={{ padding: '20px' }}>
                                            {busqueda === '' ? 'No hay clientes registrados.' : 'No se encontraron resultados para tu búsqueda.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {clientesFiltrados.length > 0 && (
                            <div className="pagination-container">
                                <span className="pagination-info">
                                    Mostrando {indicePrimerElemento + 1} a {Math.min(indiceUltimoElemento, clientesFiltrados.length)} de {clientesFiltrados.length} registros
                                </span>
                                <div className="pagination-buttons">
                                    <button
                                        className="btn-pagination"
                                        disabled={paginaActual === 1}
                                        onClick={() => setPaginaActual(paginaActual - 1)}
                                    >
                                        <LuChevronLeft /> Anterior
                                    </button>
                                    <span className="pagination-current">
                                        Página {paginaActual} de {totalPaginas}
                                    </span>
                                    <button
                                        className="btn-pagination"
                                        disabled={paginaActual === totalPaginas}
                                        onClick={() => setPaginaActual(paginaActual + 1)}
                                    >
                                        Siguiente <LuChevronRight />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {modalAbierto && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>
                                {modoModal === 'crear' && 'Registrar Nuevo Cliente'}
                                {modoModal === 'editar' && 'Editar Cliente'}
                                {modoModal === 'ver' && 'Detalles del Cliente'}
                            </h2>
                            <button className="btn-close" onClick={() => setModalAbierto(false)}>
                                <LuX />
                            </button>
                        </div>

                        <form onSubmit={handleGuardar}>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Tipo Identificación</label>
                                    <select
                                        className="form-input"
                                        name="tipoIdentificacionId"
                                        value={formData.tipoIdentificacionId}
                                        onChange={(e) => setFormData({ ...formData, tipoIdentificacionId: Number(e.target.value) })}
                                        disabled={modoModal === 'ver'}
                                    >
                                        <option value="1">Cédula</option>
                                        <option value="2">RUC</option>
                                        <option value="3">Pasaporte</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Número de Identificación</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        name="identificacion"
                                        required
                                        pattern={formData.tipoIdentificacionId !== 3 ? "[0-9]+" : undefined}
                                        title={formData.tipoIdentificacionId !== 3 ? "Solo se permiten números para Cédula o RUC" : "Ingrese una identificación válida"}
                                        onKeyPress={(e) => {
                                            // Bloquea cualquier tecla que no sea número si el tipo no es Pasaporte (3)
                                            if (formData.tipoIdentificacionId !== 3 && !/[0-9]/.test(e.key)) {
                                                e.preventDefault();
                                            }
                                        }}
                                        value={formData.identificacion}
                                        onChange={handleChange}
                                        disabled={modoModal === 'ver'}
                                    />
                                </div>

                                <div className="form-group full-width">
                                    <label className="form-label">Nombre / Razón Social</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        name="razonSocial"
                                        required
                                        value={formData.razonSocial}
                                        onChange={handleChange}
                                        disabled={modoModal === 'ver'}
                                    />
                                </div>

                                <div className="form-group full-width">
                                    <label className="form-label">Dirección</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        name="direccion"
                                        value={formData.direccion}
                                        onChange={handleChange}
                                        disabled={modoModal === 'ver'}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Teléfono</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        name="telefono"
                                        placeholder="Solo números"
                                        maxLength={10}
                                        pattern="[0-9]+"
                                        title="El número de teléfono debe contener solo dígitos"
                                        onKeyPress={(e) => {
                                            // Bloquea letras en tiempo real
                                            if (!/[0-9]/.test(e.key)) {
                                                e.preventDefault();
                                            }
                                        }}
                                        value={formData.telefono}
                                        onChange={handleChange}
                                        disabled={modoModal === 'ver'}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Correo Electrónico</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        name="correoElectronico"
                                        placeholder="ejemplo@correo.com"
                                        required 
                                        pattern="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$"
                                        title="Por favor, ingresa un correo electrónico válido con extensión (ejemplo@dominio.com)"
                                        value={formData.correoElectronico}
                                        onChange={handleChange}
                                        disabled={modoModal === 'ver'}
                                    />
                                </div>

                                {modoModal !== 'crear' && (
                                    <div className="form-group full-width" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <label className="form-label" style={{ marginBottom: 0 }}>Estado Activo:</label>
                                        <label className="switch">
                                            <input
                                                type="checkbox"
                                                name="estado"
                                                checked={formData.estado}
                                                onChange={handleChange}
                                                disabled={modoModal === 'ver'}
                                            />
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
                                        {guardando ? 'Guardando...' : (modoModal === 'crear' ? 'Guardar Cliente' : 'Actualizar Cambios')}
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

export default Clientes;