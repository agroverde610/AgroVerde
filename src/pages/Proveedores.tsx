import React, { useState, useEffect } from 'react';
import { LuSearch, LuPlus, LuTrash2, LuX, LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { FiEdit } from "react-icons/fi";
import api from '../services/api';
import '../App.css';

interface Proveedor {
    ProveedorId: number;
    RazonSocial: string;
    RUC: string;
    Direccion: string;
    Telefono: string;
    Email: string;
    Estado: boolean;
}

const Proveedores: React.FC = () => {
    const [lista, setLista] = useState<Proveedor[]>([]);
    const [busqueda, setBusqueda] = useState('');
    const [paginaActual, setPaginaActual] = useState(1);
    const elementosPorPagina = 10;

    const [modalAbierto, setModalAbierto] = useState(false);
    const [modoModal, setModoModal] = useState<'crear' | 'editar'>('crear');
    const [formData, setFormData] = useState({
        proveedorId: 0, razonSocial: '', ruc: '', direccion: '', telefono: '', email: '', estado: true
    });

    useEffect(() => { cargarDatos(); }, []);

    useEffect(() => { setPaginaActual(1); }, [busqueda]);

    const cargarDatos = async () => {
        const res = await api.get('proveedores/obtener');
        if (res.data.success) setLista(res.data.data);
    };

    const abrirModal = (modo: 'crear' | 'editar', p?: Proveedor) => {
        setModoModal(modo);
        setFormData(p ?
            { proveedorId: p.ProveedorId, razonSocial: p.RazonSocial, ruc: p.RUC, direccion: p.Direccion, telefono: p.Telefono, email: p.Email, estado: p.Estado } :
            { proveedorId: 0, razonSocial: '', ruc: '', direccion: '', telefono: '', email: '', estado: true }
        );
        setModalAbierto(true);
    };
    const [erroresForm, setErroresForm] = useState<{
        razonSocial: string | null;
        ruc: string | null;
        telefono: string | null;
        email: string | null;
    }>({
        razonSocial: null,
        ruc: null,
        telefono: null,
        email: null
    });
    const handleGuardar = async (e: React.FormEvent) => {
        e.preventDefault();
        await api.post('proveedores/guardar', formData);
        setModalAbierto(false);
        cargarDatos();
    };

    const handleEliminar = async (id: number, nombre: string) => {
        if (window.confirm(`¿Desactivar proveedor "${nombre}"?`)) {
            await api.delete(`proveedores/desactivar/${id}`);
            cargarDatos();
        }
    };

    const proveedoresFiltrados = lista.filter(p =>
        p.RazonSocial.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.RUC.includes(busqueda) ||
        p.Email.toLowerCase().includes(busqueda.toLowerCase())
    );

    const indiceUltimo = paginaActual * elementosPorPagina;
    const indicePrimero = indiceUltimo - elementosPorPagina;
    const proveedoresActuales = proveedoresFiltrados.slice(indicePrimero, indiceUltimo);
    const totalPaginas = Math.ceil(proveedoresFiltrados.length / elementosPorPagina);

    return (
        <div className="clientes-wrapper">
            <div className="clientes-header">
                <h1 className="clientes-title">Gestión de Proveedores</h1>
            </div>

            <div className="clientes-controls">
                <div className="control-box flex-grow">
                    <span className="control-label">Búsqueda Inteligente</span>
                    <div className="search-input-group">
                        <input
                            type="text"
                            placeholder="Buscar por RUC, Nombre o Email..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                        <button className="btn"><LuSearch /></button>
                    </div>
                </div>
                <div className="control-box action-box">
                    <span className="control-label">Acciones</span>
                    <button className="btn" onClick={() => abrirModal('crear')}><LuPlus /> Nuevo</button>
                </div>
            </div>

            <div className="table-container">
                <table className="clientes-table">
                    <thead>
                        <tr>
                            <th>Razón Social</th><th>RUC</th><th>Dirección</th><th>Teléfono</th><th>Email</th><th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {proveedoresActuales.map((p) => (
                            <tr key={p.ProveedorId}>
                                <td className="client-name-cell">{p.RazonSocial}</td>
                                <td>{p.RUC}</td>
                                <td>{p.Direccion}</td>
                                <td>{p.Telefono}</td>
                                <td>{p.Email}</td>
                                <td className="actions-cell">
                                    <button className="btn-icon edit" onClick={() => abrirModal('editar', p)}><FiEdit /></button>
                                    <button className="btn-icon delete" onClick={() => handleEliminar(p.ProveedorId, p.RazonSocial)}><LuTrash2 /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {proveedoresFiltrados.length > 0 && (
                    <div className="pagination-container">
                        <span className="pagination-info">Mostrando {indicePrimero + 1} a {Math.min(indiceUltimo, proveedoresFiltrados.length)} de {proveedoresFiltrados.length}</span>
                        <div className="pagination-buttons">
                            <button className="btn-pagination" disabled={paginaActual === 1} onClick={() => setPaginaActual(paginaActual - 1)}><LuChevronLeft /> Anterior</button>
                            <span className="pagination-current">Pág {paginaActual} de {totalPaginas}</span>
                            <button className="btn-pagination" disabled={paginaActual === totalPaginas} onClick={() => setPaginaActual(paginaActual + 1)}>Siguiente <LuChevronRight /></button>
                        </div>
                    </div>
                )}
            </div>
            {modalAbierto && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '800px', margin: '20px auto' }}>
                        <div className="modal-header">
                            <h2>{modoModal === 'crear' ? 'Nuevo Proveedor' : 'Editar Proveedor'}</h2>
                            <button className="btn-close" onClick={() => setModalAbierto(false)}>
                                <LuX />
                            </button>
                        </div>

                        <form onSubmit={handleGuardar}>
                            <div className="form-grid">

                                {/* RAZÓN SOCIAL */}
                                <div className="form-group full-width">
                                    <label className="form-label">Razón Social</label>
                                    <input
                                        className="form-input"
                                        value={formData.razonSocial}
                                        onChange={(e) => {
                                            const valor = e.target.value;
                                            setFormData({ ...formData, razonSocial: valor });

                                            // Opcional: Validar si quieres que solo lleve letras y espacios
                                            if (valor && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ.\s]+$/.test(valor)) {
                                                setErroresForm(prev => ({ ...prev, razonSocial: "Solo se permiten letras" }));
                                            } else {
                                                setErroresForm(prev => ({ ...prev, razonSocial: null }));
                                            }
                                        }}
                                        required
                                    />
                                    {erroresForm.razonSocial && (
                                        <span style={{ color: '#d9534f', fontSize: '12px', marginTop: '4px', display: 'block', fontWeight: '500' }}>
                                            ⚠️ {erroresForm.razonSocial}
                                        </span>
                                    )}
                                </div>

                                {/* RUC */}
                                <div className="form-group">
                                    <label className="form-label">RUC</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.ruc}
                                        maxLength={13}
                                        placeholder="Ej: 1790000000001"
                                        onChange={(e) => {
                                            const valor = e.target.value;

                                            // Validamos si contiene algo que no sea números
                                            if (valor && !/^[0-9]*$/.test(valor)) {
                                                setErroresForm(prev => ({ ...prev, ruc: "Solo se permiten números" }));
                                            } else if (valor && valor.length < 13) {
                                                setErroresForm(prev => ({ ...prev, ruc: "Debe tener exactamente 13 dígitos" }));
                                            } else {
                                                setErroresForm(prev => ({ ...prev, ruc: null }));
                                            }

                                            // Reemplaza instantáneamente cualquier carácter no numérico
                                            setFormData({ ...formData, ruc: valor.replace(/\D/g, '') });
                                        }}
                                        required
                                    />
                                    {erroresForm.ruc && (
                                        <span style={{ color: '#d9534f', fontSize: '12px', marginTop: '4px', display: 'block', fontWeight: '500' }}>
                                            ⚠️ {erroresForm.ruc}
                                        </span>
                                    )}
                                </div>

                                {/* DIRECCIÓN */}
                                <div className="form-group">
                                    <label className="form-label">Dirección</label>
                                    <input
                                        className="form-input"
                                        value={formData.direccion}
                                        onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                                        required
                                    />
                                </div>

                                {/* TELÉFONO */}
                                <div className="form-group">
                                    <label className="form-label">Teléfono</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.telefono}
                                        maxLength={10}
                                        placeholder="Ej: 0999999999"
                                        onChange={(e) => {
                                            const valor = e.target.value;

                                            if (valor && !/^[0-9]*$/.test(valor)) {
                                                setErroresForm(prev => ({ ...prev, telefono: "Solo se permiten números" }));
                                            } else if (valor && valor.length < 10) {
                                                setErroresForm(prev => ({ ...prev, telefono: "Debe tener exactamente 10 dígitos" }));
                                            } else {
                                                setErroresForm(prev => ({ ...prev, telefono: null }));
                                            }

                                            setFormData({ ...formData, telefono: valor.replace(/\D/g, '') });
                                        }}
                                        required
                                    />
                                    {erroresForm.telefono && (
                                        <span style={{ color: '#d9534f', fontSize: '12px', marginTop: '4px', display: 'block', fontWeight: '500' }}>
                                            ⚠️ {erroresForm.telefono}
                                        </span>
                                    )}
                                </div>

                                {/* EMAIL */}
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="ejemplo@correo.com"
                                        value={formData.email}
                                        onChange={(e) => {
                                            const valor = e.target.value;
                                            setFormData({ ...formData, email: valor });

                                            const patronEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
                                            if (valor && !patronEmail.test(valor)) {
                                                setErroresForm(prev => ({ ...prev, email: "Formato de correo inválido (ejemplo@dominio.com)" }));
                                            } else {
                                                setErroresForm(prev => ({ ...prev, email: null }));
                                            }
                                        }}
                                        required
                                    />
                                    {erroresForm.email && (
                                        <span style={{ color: '#d9534f', fontSize: '12px', marginTop: '4px', display: 'block', fontWeight: '500' }}>
                                            ⚠️ {erroresForm.email}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="modal-footer" style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn-cancelar" onClick={() => setModalAbierto(false)}>
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn-guardar"
                                    disabled={Object.values(erroresForm).some(error => error !== null)}
                                >
                                    Guardar Proveedor
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
export default Proveedores;