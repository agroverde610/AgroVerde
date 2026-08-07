import React, { useState } from 'react';
import api from '../services/api';
import { LuEye, LuEyeOff, LuTriangleAlert } from 'react-icons/lu';
import '../App.css';
import './LoginPage.css';
import { useNavigate } from "react-router-dom";
import logoAgroVerde from "../assets/logo-agroverde.png";

const CONTACTO_SOPORTE = 'soporte@agroverde.com';

const obtenerMensajeError = (err: any): string => {
    const status = err?.response?.status;
    if (status === 400 || status === 401) {
        return err.response?.data?.mensaje || 'Usuario o contraseña incorrectos.';
    }
    return `Ocurrió un problema técnico. Por favor comunícate con soporte técnico (${CONTACTO_SOPORTE}).`;
};

const Login: React.FC = () => {
    const [vista, setVista] = useState<'login' | 'solicitar' | 'restablecer'>('login');

    const [usuario, setUsuario] = useState('');
    const [password, setpassword] = useState('');
    const [mostrarPassword, setMostrarPassword] = useState(false);

    const [correo, setCorreo] = useState('');
    const [token, setToken] = useState('');
    const [nuevaPassword, setNuevaPassword] = useState('');
    const [mostrarNuevaPassword, setMostrarNuevaPassword] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [mensajeExito, setMensajeExito] = useState<string | null>(null);
    const [cargando, setCargando] = useState(false);

    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setMensajeExito(null);
        setCargando(true);

        try {
            const respuesta = await api.post('login/autenticar', { usuario, password });
            if (respuesta.data.success) {
                if (respuesta.data.token) {
                    localStorage.setItem('token', respuesta.data.token);
                }
                localStorage.setItem("usuario", JSON.stringify(respuesta.data.data));

                // Marca de tiempo para el control de inactividad
                localStorage.setItem("ultimaActividad", Date.now().toString());

                // Si el backend indica que toca cambiar contraseña
                // (primer ingreso o ya pasaron los 2 meses), lo mandamos
                // a esa pantalla en vez de al dashboard.
                if (respuesta.data.data.debeCambiarPassword) {
                    navigate("/cambiar-password-obligatorio");
                } else {
                    navigate("/dashboard");
                }
            }
        } catch (err: any) {
            setError(obtenerMensajeError(err));
        } finally {
            setCargando(false);
        }
    };

    const handleSolicitar = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setMensajeExito(null);
        setCargando(true);

        try {
            const respuesta = await api.post('Login/SolicitarRecuperacion', { correo });
            if (respuesta.data.success) {
                setMensajeExito(respuesta.data.mensaje);
                setVista('restablecer');
            }
        } catch (err: any) {
            setError(obtenerMensajeError(err));
        } finally {
            setCargando(false);
        }
    };

    const handleRestablecer = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setMensajeExito(null);
        setCargando(true);

        try {
            const respuesta = await api.post('Login/RestablecerPassword', { token, nuevaPassword });
            if (respuesta.data.success) {
                alert('Contraseña actualizada con éxito. Ya puedes iniciar sesión.');
                setToken('');
                setNuevaPassword('');
                setCorreo('');
                setVista('login');
            }
        } catch (err: any) {
            setError(obtenerMensajeError(err));
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
                        <h1>Gestiona tu negocio agroquímico en un solo lugar</h1>
                        <p>Inventario, ventas, compras y promociones, todo sincronizado en tiempo real.</p>
                    </div>

                    <div className="login-panel-branding-footer">
                        © {new Date().getFullYear()} Agro Verde
                    </div>
                </div>

                <div className="login-panel-form">
                    <img src={logoAgroVerde} alt="Agro Verde" className="login-logo" />

                    {error && (
                        <div className="login-error-box">
                            <LuTriangleAlert size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                            <span>{error}</span>
                        </div>
                    )}
                    {mensajeExito && <div className="success-message" style={{ marginBottom: 14 }}>{mensajeExito}</div>}

                    {vista === 'login' && (
                        <div>
                            <h2>Iniciar sesión</h2>
                            <p className="login-subtitle">Ingresa tus credenciales para continuar.</p>

                            <form onSubmit={handleLogin}>
                                <div className="form-group">
                                    <label className="form-label">Usuario</label>
                                    <input
                                        type="text"
                                        value={usuario}
                                        onChange={(e) => setUsuario(e.target.value)}
                                        required
                                        className="form-input"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Contraseña</label>
                                    <div className="login-password-wrap">
                                        <input
                                            type={mostrarPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setpassword(e.target.value)}
                                            required
                                            className="form-input"
                                        />
                                        <button
                                            type="button"
                                            className="login-password-toggle"
                                            onClick={() => setMostrarPassword(!mostrarPassword)}
                                            tabIndex={-1}
                                            aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                        >
                                            {mostrarPassword ? <LuEyeOff size={18} /> : <LuEye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <button type="submit" disabled={cargando} className="form-button">
                                    {cargando ? 'Cargando...' : 'Entrar'}
                                </button>
                            </form>

                            <div className="login-link-row">
                                <button
                                    type="button"
                                    onClick={() => { setError(null); setMensajeExito(null); setVista('solicitar'); }}
                                    className="link-button"
                                >
                                    ¿Olvidaste tu contraseña?
                                </button>
                            </div>
                        </div>
                    )}

                    {vista === 'solicitar' && (
                        <div>
                            <h2>Recuperar contraseña</h2>
                            <p className="login-help-text">Ingresa tu correo y te enviaremos un código de seguridad de 6 dígitos.</p>
                            <form onSubmit={handleSolicitar}>
                                <div className="form-group">
                                    <label className="form-label">Correo electrónico</label>
                                    <input
                                        type="email"
                                        value={correo}
                                        onChange={(e) => setCorreo(e.target.value)}
                                        required
                                        className="form-input"
                                    />
                                </div>
                                <button type="submit" disabled={cargando} className="form-button">
                                    {cargando ? 'Enviando...' : 'Enviar código'}
                                </button>
                            </form>

                            <div className="login-link-row">
                                <button
                                    type="button"
                                    onClick={() => { setError(null); setVista('login'); }}
                                    className="link-button secundario"
                                >
                                    Volver al inicio de sesión
                                </button>
                            </div>
                        </div>
                    )}

                    {vista === 'restablecer' && (
                        <div>
                            <h2>Restablecer contraseña</h2>
                            <p className="login-help-text">Revisa tu bandeja de entrada y coloca el código aquí.</p>
                            <form onSubmit={handleRestablecer}>
                                <div className="form-group">
                                    <label className="form-label">Código de seguridad</label>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        value={token}
                                        onChange={(e) => setToken(e.target.value.toUpperCase())}
                                        required
                                        placeholder="EJ: A4F9B2"
                                        className="form-input token-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Nueva contraseña</label>
                                    <div className="login-password-wrap">
                                        <input
                                            type={mostrarNuevaPassword ? 'text' : 'password'}
                                            value={nuevaPassword}
                                            onChange={(e) => setNuevaPassword(e.target.value)}
                                            required
                                            className="form-input"
                                        />
                                        <button
                                            type="button"
                                            className="login-password-toggle"
                                            onClick={() => setMostrarNuevaPassword(!mostrarNuevaPassword)}
                                            tabIndex={-1}
                                            aria-label={mostrarNuevaPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                        >
                                            {mostrarNuevaPassword ? <LuEyeOff size={18} /> : <LuEye size={18} />}
                                        </button>
                                    </div>
                                </div>
                                <button type="submit" disabled={cargando} className="form-button">
                                    {cargando ? 'Actualizando...' : 'Cambiar contraseña'}
                                </button>
                            </form>

                            <div className="login-link-row">
                                <button
                                    type="button"
                                    onClick={() => { setError(null); setVista('login'); }}
                                    className="link-button secundario"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;