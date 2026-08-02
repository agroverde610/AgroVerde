import React, { useState, useEffect } from 'react';
import {
    LuCalculator,
    LuDatabase,
    LuExternalLink,
    LuDownload,
    LuCircleCheck
} from "react-icons/lu";
import api from '../services/api';
import '../App.css';

const Herramientas: React.FC = () => {
    const [monto, setMonto] = useState<number | string>('');
    const [tipoIva, setTipoIva] = useState<number>(15);

    const [ultimoRespaldo, setUltimoRespaldo] = useState<string>('Cargando...');
    const [respaldando, setRespaldando] = useState(false);
    const [mensajeExito, setMensajeExito] = useState(false);

    const subtotal = Number(monto) || 0;
    const valorIva = (subtotal * tipoIva) / 100;
    const total = subtotal + valorIva;

    useEffect(() => {
        obtenerFechaRespaldo();
    }, []);

    const obtenerFechaRespaldo = async () => {
        try {
            const respuesta = await api.get('herramientas/ultimorespaldo');
            if (respuesta.data.success) {
                setUltimoRespaldo(respuesta.data.fecha);
            }
        } catch (error) {
            setUltimoRespaldo("Error al cargar fecha");
        }
    };

    const handleGenerarRespaldo = async () => {
        setRespaldando(true);
        try {
            const response = await api.get('herramientas/backup', { responseType: 'blob' });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            const contentDisposition = response.headers['content-disposition'];
            let fileName = 'AgroSystem_Backup.bak';
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
                if (fileNameMatch && fileNameMatch.length === 2) {
                    fileName = fileNameMatch[1];
                }
            }

            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);

            setMensajeExito(true);
            setTimeout(() => setMensajeExito(false), 3000);
            obtenerFechaRespaldo();

        } catch (error: any) {
            alert("No se pudo generar el respaldo de la base de datos. Verifica los permisos del servidor.");
        } finally {
            setRespaldando(false);
        }
    };

    return (
        <div className="clientes-wrapper">
            <div className="clientes-header">
                <h1 className="clientes-title">Herramientas y Utilidades</h1>
            </div>

            {mensajeExito && (
                <div className="toast-notification">
                    <LuCircleCheck className="toast-icon" />
                    <span>¡Respaldo de base de datos descargado con éxito!</span>
                </div>
            )}

            <div className="dashboard-grid">

                {/* 1. CALCULADORA RÁPIDA DE IVA */}
                <div className="dash-card">
                    <div className="flex-row form-group">
                        <div className="dash-icon-box bg-light-green">
                            <LuCalculator className="toast-icon" />
                        </div>
                        <h3 className="card-title">Calculadora Rápida</h3>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Subtotal (USD)</label>
                        <input
                            type="number"
                            className="form-input"
                            placeholder="0.00"
                            value={monto}
                            onChange={(e) => setMonto(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Tipo de IVA</label>
                        <select
                            className="form-input"
                            value={tipoIva}
                            onChange={(e) => setTipoIva(Number(e.target.value))}
                        >
                            <option value={15}>15% (General)</option>
                            <option value={5}>5% (Materiales Construcción)</option>
                            <option value={0}>0% (Insumos Agrícolas)</option>
                        </select>
                    </div>

                    <div className="control-box">
                        <div className="pos-ticket-fila">
                            <span>Subtotal:</span>
                            <span>${subtotal.toFixed(2)}</span>
                        </div>
                        <div className="pos-ticket-fila">
                            <span>IVA ({tipoIva}%):</span>
                            <span>${valorIva.toFixed(2)}</span>
                        </div>
                        <div className="pos-ticket-totales">
                            <div className="pos-ticket-total">
                                <span>TOTAL:</span>
                                <span className="pos-producto-precio">${total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="dash-card">
                    <div className="flex-row form-group">
                        <div className="dash-icon-box">
                            <LuExternalLink className="search-icon" />
                        </div>
                        <h3 className="card-title">Enlaces del SRI</h3>
                    </div>

                    <p className="form-help-text">
                        Accesos rápidos a servicios institucionales para validación de datos.
                    </p>

                    <ul className="data-list">
                        <li>
                            <a
                                href="https://srienlinea.sri.gob.ec/sri-en-linea/SriRucWeb/ConsultaRuc/Consultas/consultaRuc"
                                target="_blank"
                                rel="noreferrer"
                                className="link-button"
                            >
                                Consulta de RUC (SRI)
                            </a>
                            <LuExternalLink />
                        </li>
                        <li>
                            <a
                                href="https://srienlinea.sri.gob.ec/sri-en-linea/SriComprobantesFisicosWeb/ConsultaValidez/Consultas/consultaValidez"
                                target="_blank"
                                rel="noreferrer"
                                className="link-button secundario"
                            >
                                Validez de Comprobantes
                            </a>
                            <LuExternalLink />
                        </li>
                        <li>
                            <a
                                href="https://www.ecuadorencifras.gob.ec/institucional/home/"
                                target="_blank"
                                rel="noreferrer"
                                className="link-button secundario"
                            >
                                INEC (Datos Estadísticos)
                            </a>
                            <LuExternalLink />
                        </li>
                    </ul>
                </div>

                <div className="dash-card">
                    <div className="flex-row form-group">
                        <div className="dash-icon-box error-message">
                            <LuDatabase />
                        </div>
                        <h3 className="card-title">Mantenimiento</h3>
                    </div>

                    <p className="form-help-text">
                        Genera una copia de seguridad local de la base de datos de AgroSystem para prevenir pérdida de información.
                    </p>

                    <div className="form-group text-center">
                        <label className="form-label">Último respaldo exitoso:</label>
                        <span className="user-name">{ultimoRespaldo}</span>
                    </div>

                    <button
                        className="form-button flex-center"
                        onClick={handleGenerarRespaldo}
                        disabled={respaldando}
                    >
                        <LuDownload style={{ marginRight: '8px' }} />
                        {respaldando ? 'Comprimiendo BD...' : 'Descargar Backup (.bak)'}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default Herramientas;