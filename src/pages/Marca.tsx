import React, { useState, useEffect } from 'react';
import { LuSearch, LuPlus, LuTrash2, LuX } from "react-icons/lu";
import { FiEdit } from "react-icons/fi";
import api from '../services/api';
import '../App.css';

interface Marca {
    idMarca: number;
    nombre: string;
    descripcion: string;
}

const Marca: React.FC = () => {
    const [lista, setLista] = useState<Marca[]>([]);
    const [cargando, setCargando] = useState<boolean>(true);
    const [,setError] = useState<string | null>(null);
    const [modalAbierto, setModalAbierto] = useState<boolean>(false);
    const [modoModal, setModoModal] = useState<'crear' | 'editar'>('crear');
    const [guardando, setGuardando] = useState<boolean>(false);
    const [busqueda, setBusqueda] = useState('');
    const [paginaActual, setPaginaActual] = useState(1);
    const elementosPorPagina = 10;

    const [formData, setFormData] = useState({ idMarca: 0, nombre: '', descripcion: '' });

    useEffect(() => {
        cargarDatos();
    }, []);

    useEffect(() => {
        setPaginaActual(1);
    }, [busqueda]);

    const cargarDatos = async () => {
        try {
            setCargando(true);
            const res = await api.get('/marca/listar');
            if (res.data.success) setLista(res.data.data);
        } catch (err: any) {
            setError('Error al cargar marcas');
        } finally {
            setCargando(false);
        }
    };

    const abrirModal = (modo: 'crear' | 'editar', marca?: Marca) => {
        setModoModal(modo);
        setFormData(marca ? marca : { idMarca: 0, nombre: '', descripcion: '' });
        setModalAbierto(true);
    };

    const handleGuardar = async (e: React.FormEvent) => {
        e.preventDefault();
        setGuardando(true);
        try {
            await api.post('/marca/guardar', {
                IdMarca: formData.idMarca || null,
                Nombre: formData.nombre,
                Descripcion: formData.descripcion
            });
            alert(`Marca ${modoModal === 'crear' ? 'registrada' : 'actualizada'} con éxito`);
            setModalAbierto(false);
            cargarDatos();
        } catch (err: any) {
            alert('Error al guardar marca');
        } finally {
            setGuardando(false);
        }
    };

    const filtrados = lista.filter(m =>
        m.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (m.descripcion && m.descripcion.toLowerCase().includes(busqueda.toLowerCase()))
    );

    const indiceUltimo = paginaActual * elementosPorPagina;
    const indicePrimero = indiceUltimo - elementosPorPagina;
    const actuales = filtrados.slice(indicePrimero, indiceUltimo);
    //const totalPaginas = Math.ceil(filtrados.length / elementosPorPagina);

    const handleEliminar = async (id: number, nombre: string) => {
        const confirmar = window.confirm(`¿Estás seguro de que deseas desactivar al usuario "${nombre}"?`);
        if (confirmar) {
            try {
                const respuesta = await api.delete(`marca/desactivar/${id}`);
                if (respuesta.data.success) {
                    alert('Marca desactivada correctamente.');
                    cargarDatos();
                }
            } catch (err: any) {
                alert(err.response?.data?.mensaje || 'Error al desactivar');
            }
        }
    };

    return (
        <div className="clientes-wrapper">
            <div className="clientes-header">
                <h1 className="clientes-title">Gestión de Marcas</h1>
            </div>

            <div className="clientes-controls">
                <div className="control-box flex-grow">
                    <span className="control-label">Búsqueda Inteligente</span>
                    <div className="search-input-group">
                        <input type="text" placeholder="Buscar por nombre..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                        <button className="btn"><LuSearch /></button>
                    </div>
                </div>
                <div className="control-box action-box">
                    <span className="control-label">Acción</span>
                    <button className="btn" onClick={() => abrirModal('crear')}><LuPlus /> Nueva Marca</button>
                </div>
            </div>

            <div className="table-container">
                {cargando ? <div className="text-center">Cargando...</div> : (
                    <table className="clientes-table">
                        <thead><tr><th>Nombre</th><th>Descripción</th><th>Acciones</th></tr></thead>
                        <tbody>
                            {actuales.map(m => (
                                <tr key={m.idMarca}>
                                    <td><strong>{m.nombre}</strong></td>
                                    <td>{m.descripcion}</td>
                                    <td>
                                        <div className="actions-cell">
                                            <button className="btn-icon edit" onClick={() => abrirModal('editar', m)}><FiEdit /></button>
                                            <button className="btn-icon delete" onClick={() => handleEliminar(m.idMarca, m.nombre)}><LuTrash2 /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {actuales.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center" style={{ padding: '20px' }}>
                                        {busqueda === '' ? 'No hay marcas registradas.' : 'No se encontraron resultados.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {modalAbierto && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>{modoModal === 'crear' ? 'Nueva Marca' : 'Editar Marca'}</h2>
                            <button className="btn-close" onClick={() => setModalAbierto(false)}><LuX /></button>
                        </div>
                        <form onSubmit={handleGuardar}>
                            <div className="form-grid">
                                <div className="form-group full-width">
                                    <label className="form-label">Nombre</label>
                                    <input className="form-input" value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} required />
                                </div>
                                <div className="form-group full-width">
                                    <label className="form-label">Descripción</label>
                                    <input className="form-input" value={formData.descripcion} onChange={e => setFormData({ ...formData, descripcion: e.target.value })} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="submit" className="btn-guardar" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Marca;