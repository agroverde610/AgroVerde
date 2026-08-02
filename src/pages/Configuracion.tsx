import React, { useState, useEffect } from 'react';
import { LuStore, LuSave, LuCircleCheck } from "react-icons/lu";
import api from '../services/api';
import '../App.css';

const Configuracion: React.FC = () => {
    const [guardando, setGuardando] = useState(false);
    const [cargando, setCargando] = useState(true);
    const [mensajeExito, setMensajeExito] = useState(false);

    const [config, setConfig] = useState({
        ruc: '', razonSocial: '', nombreComercial: '', direccion: '',
        telefono: '', correo: '', ambienteSri: '1', obligadoContabilidad: 'NO',
        porcentajeIva: 15, moneda: 'USD', impresora: 'Termica80mm'
    });

    useEffect(() => {
        const cargarParametros = async () => {
            try {
                const response = await api.get('parametros/obtener');
                if (response.data.success) {
                    setConfig(response.data.data);
                }
            } catch (error) {
                console.error("Error al cargar configuraciones:", error);
            } finally {
                setCargando(false);
            }
        };
        cargarParametros();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setConfig({ ...config, [name]: name === 'porcentajeIva' ? Number(value) : value });
    };

    const handleGuardar = async (e: React.FormEvent) => {
        e.preventDefault();
        setGuardando(true);
        try {
            const response = await api.put('parametros/actualizar', config);
            if (response.data.success) {
                setMensajeExito(true);
                setTimeout(() => setMensajeExito(false), 3000);
            }
        } catch (error) {
            alert("Error al guardar la configuración.");
        } finally {
            setGuardando(false);
        }
    };

    if (cargando) return <div className="text-center" style={{ padding: '40px' }}>Cargando configuraciones...</div>;

    return (
        <div className="clientes-wrapper">
            <div className="clientes-header">
                <h1 className="clientes-title">Configuración del Sistema</h1>
            </div>

            {mensajeExito && (
                <div className="toast-notification">
                    <LuCircleCheck className="toast-icon" />
                    <span>¡Configuraciones guardadas en la Base de Datos!</span>
                </div>
            )}

            <form onSubmit={handleGuardar}>
                <div className="form-group">
                    <div className="control-box">
                        <div className="flex-row form-group">
                            <div className="dash-icon-box bg-light-green">
                                <LuStore className="toast-icon" />
                            </div>
                            <h3 className="card-title">Datos del Establecimiento</h3>
                        </div>

                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">RUC (13 dígitos)</label>
                                <input type="text" className="form-input" name="ruc" maxLength={13} value={config.ruc} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Razón Social</label>
                                <input type="text" className="form-input" name="razonSocial" value={config.razonSocial} onChange={handleChange} required />
                            </div>
                            <div className="form-group full-width">
                                <label className="form-label">Nombre Comercial</label>
                                <input type="text" className="form-input" name="nombreComercial" value={config.nombreComercial} onChange={handleChange} />
                            </div>
                            <div className="form-group full-width">
                                <label className="form-label">Dirección Matriz</label>
                                <input type="text" className="form-input" name="direccion" value={config.direccion} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Teléfono</label>
                                <input type="text" className="form-input" name="telefono" value={config.telefono} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Correo Electrónico</label>
                                <input type="email" className="form-input" name="correo" value={config.correo} onChange={handleChange} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button type="submit" className="btn-guardar flex-center" disabled={guardando}>
                        <LuSave style={{ marginRight: '8px' }} />
                        {guardando ? 'Guardando...' : 'Guardar Configuraciones'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Configuracion;