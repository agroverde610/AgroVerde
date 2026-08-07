import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { LuEye, LuEyeOff, LuTriangleAlert } from 'react-icons/lu';
import './LoginPage.css';
import '../App.css';
import logoAgroVerde from "../assets/logo-agroverde.png";

const CambiarPasswordObligatorio: React.FC = () => {
    const [passwordActual, setPasswordActual] = useState('');
    const [nuevaPassword, setNuevaPassword] = useState('');
    const [confirmarPassword, setConfirmarPassword] = useState('');
    const [mostrarActual, setMostrarActual] = useState(false);
    const [mostrarNueva, setMostrarNueva] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cargando, setCargando] = useState(false);

    const navigate = useNavigate();
    const usuarioGuardado = JSON.parse(localStorage.getItem('usuario') || '{}');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (nuevaPassword !== confirmarPassword) {
            setError('Las contraseñas nuevas no coinciden.');
            return;
        }
        if (nuevaPassword.length < 6) {
            setError('La nueva contraseña debe tener al menos 6 caracteres.');
            return;
        }
        if (nuevaPassword === passwordActual) {
            setError('La nueva contraseña debe ser diferente a la actual.');
            return;
        }

        setCargando(true);
        try {
            const respuesta = await api.post('Login/CambiarPassword', {
                usuarioId: usuarioGuardado.id,
                passwordActual,
                nuevaPassword
            });

            if (respuesta.data.success) {
                alert('Contraseña actualizada correctamente.');
                navigate('/dashboard');
            }
        } catch (err: any) {
            setError(err.response?.data?.mensaje || 'No se pudo actualizar la contraseña.');
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="login-page-wrapper">
            <div className="login-card">
                <div className="login-panel-branding">
                    <div className="login-panel-branding-top" style={{ justifyContent: 'center', marginBottom: 8 }}>
                        <img
                            src={logoAgroVerde}
                            alt="Agro Verde"
                            style={{ width: '100%', maxWidth: 340, height: 'auto', objectFit: 'contain' }}
                        />
                    </div>
                    <div>
                        <h1>Es hora de actualizar tu contraseña</h1>
                        <p>Por tu seguridad, necesitamos que la cambies antes de continuar.</p>
                    </div>
                    <div className="login-panel-branding-footer">
                        © {new Date().getFullYear()} Agro Verde
                    </div>
                </div>

                <div className="login-panel-form">
                    <img src={logoAgroVerde} alt="Agro Verde" className="login-logo" />

                    <h2>Actualiza tu contraseña</h2>
                    <p className="login-subtitle">
                        {usuarioGuardado.username ? `Hola, ${usuarioGuardado.nombre}. ` : ''}
                        Debes establecer una nueva contraseña para continuar.
                    </p>

                    {error && (
                        <div className="login-error-box">
                            <LuTriangleAlert size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Contraseña actual</label>
                            <div className="login-password-wrap">
                                <input
                                    type={mostrarActual ? 'text' : 'password'}
                                    value={passwordActual}
                                    onChange={(e) => setPasswordActual(e.target.value)}
                                    required
                                    className="form-input"
                                />
                                <button
                                    type="button"
                                    className="login-password-toggle"
                                    onClick={() => setMostrarActual(!mostrarActual)}
                                    tabIndex={-1}
                                >
                                    {mostrarActual ? <LuEyeOff size={18} /> : <LuEye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Nueva contraseña</label>
                            <div className="login-password-wrap">
                                <input
                                    type={mostrarNueva ? 'text' : 'password'}
                                    value={nuevaPassword}
                                    onChange={(e) => setNuevaPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className="form-input"
                                />
                                <button
                                    type="button"
                                    className="login-password-toggle"
                                    onClick={() => setMostrarNueva(!mostrarNueva)}
                                    tabIndex={-1}
                                >
                                    {mostrarNueva ? <LuEyeOff size={18} /> : <LuEye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Confirmar nueva contraseña</label>
                            <input
                                type={mostrarNueva ? 'text' : 'password'}
                                value={confirmarPassword}
                                onChange={(e) => setConfirmarPassword(e.target.value)}
                                required
                                minLength={6}
                                className="form-input"
                            />
                        </div>

                        <button type="submit" disabled={cargando} className="form-button">
                            {cargando ? 'Actualizando...' : 'Actualizar contraseña'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CambiarPasswordObligatorio;