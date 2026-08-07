import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { LuEye, LuEyeOff, LuUser, LuSave } from 'react-icons/lu';
import '../App.css';

const Perfil: React.FC = () => {
    const usuarioGuardado = JSON.parse(localStorage.getItem('usuario') || '{}');

    const [nombre, setNombre] = useState('');
    const [username, setUsername] = useState('');
    const [correo, setCorreo] = useState('');
    const [rol, setRol] = useState('');
    const [cargandoPerfil, setCargandoPerfil] = useState(true);
    const [guardandoPerfil, setGuardandoPerfil] = useState(false);
    const [mensajePerfil, setMensajePerfil] = useState<string | null>(null);
    const [errorPerfil, setErrorPerfil] = useState<string | null>(null);

    // Cambio de contraseña voluntario
    const [passwordActual, setPasswordActual] = useState('');
    const [nuevaPassword, setNuevaPassword] = useState('');
    const [confirmarPassword, setConfirmarPassword] = useState('');
    const [mostrarActual, setMostrarActual] = useState(false);
    const [mostrarNueva, setMostrarNueva] = useState(false);
    const [guardandoPassword, setGuardandoPassword] = useState(false);
    const [mensajePassword, setMensajePassword] = useState<string | null>(null);
    const [errorPassword, setErrorPassword] = useState<string | null>(null);

    useEffect(() => {
        cargarPerfil();
    }, []);

    const cargarPerfil = async () => {
        setCargandoPerfil(true);
        try {
            const respuesta = await api.get(`Login/Perfil/${usuarioGuardado.id}`);
            if (respuesta.data.success) {
                const { nombre, username, correo, rol } = respuesta.data.data;
                setNombre(nombre);
                setUsername(username);
                setCorreo(correo);
                setRol(rol);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setCargandoPerfil(false);
        }
    };

    const handleGuardarPerfil = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorPerfil(null);
        setMensajePerfil(null);
        setGuardandoPerfil(true);

        try {
            const respuesta = await api.put('Login/Perfil', {
                usuarioId: usuarioGuardado.id,
                nombre,
                correo
            });

            if (respuesta.data.success) {
                setMensajePerfil('Datos actualizados correctamente.');

                // Actualiza también el nombre en localStorage para que se refleje
                // en el resto de la app (ej. saludo en el header).
                const actualizado = { ...usuarioGuardado, nombre };
                localStorage.setItem('usuario', JSON.stringify(actualizado));
            }
        } catch (err: any) {
            setErrorPerfil(err.response?.data?.mensaje || 'No se pudo actualizar el perfil.');
        } finally {
            setGuardandoPerfil(false);
        }
    };

    const handleCambiarPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorPassword(null);
        setMensajePassword(null);

        if (nuevaPassword !== confirmarPassword) {
            setErrorPassword('Las contraseñas nuevas no coinciden.');
            return;
        }
        if (nuevaPassword.length < 6) {
            setErrorPassword('La nueva contraseña debe tener al menos 6 caracteres.');
            return;
        }

        setGuardandoPassword(true);
        try {
            const respuesta = await api.post('Login/CambiarPassword', {
                usuarioId: usuarioGuardado.id,
                passwordActual,
                nuevaPassword
            });

            if (respuesta.data.success) {
                setMensajePassword('Contraseña actualizada correctamente.');
                setPasswordActual('');
                setNuevaPassword('');
                setConfirmarPassword('');
            }
        } catch (err: any) {
            setErrorPassword(err.response?.data?.mensaje || 'No se pudo actualizar la contraseña.');
        } finally {
            setGuardandoPassword(false);
        }
    };

    if (cargandoPerfil) {
        return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Cargando perfil...</div>;
    }

    return (
        <div className="clientes-wrapper">
            <div className="clientes-header">
                <h1 className="clientes-title"><LuUser style={{ verticalAlign: 'middle', marginRight: 8 }} />Mi Perfil</h1>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginTop: '20px' }}>

                {/* CARD: DATOS DEL PERFIL */}
                <form onSubmit={handleGuardarPerfil} className="modal-content" style={{ maxWidth: 'none' }}>
                    <h2 style={{ marginTop: 0 }}>Datos personales</h2>

                    {errorPerfil && <div className="error-message" style={{ marginBottom: 12 }}>{errorPerfil}</div>}
                    {mensajePerfil && <div className="success-message" style={{ marginBottom: 12 }}>{mensajePerfil}</div>}

                    <div className="form-group">
                        <label className="form-label">Nombre completo</label>
                        <input
                            className="form-input"
                            value={nombre}
                            onChange={e => setNombre(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Usuario</label>
                        <input className="form-input" value={username} disabled style={{ background: '#f3f4f6', color: '#6c757d' }} />
                        <small style={{ color: '#9ca3af' }}>El nombre de usuario no se puede modificar.</small>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Correo electrónico</label>
                        <input
                            className="form-input"
                            type="email"
                            value={correo}
                            onChange={e => setCorreo(e.target.value)}
                            placeholder="correo@ejemplo.com"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Rol</label>
                        <input className="form-input" value={rol} disabled style={{ background: '#f3f4f6', color: '#6c757d' }} />
                    </div>

                    <button type="submit" className="btn-guardar" disabled={guardandoPerfil}>
                        <LuSave style={{ verticalAlign: 'middle', marginRight: 6 }} />
                        {guardandoPerfil ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                </form>

                {/* CARD: CAMBIO DE CONTRASEÑA */}
                <form onSubmit={handleCambiarPassword} className="modal-content" style={{ maxWidth: 'none' }}>
                    <h2 style={{ marginTop: 0 }}>Cambiar contraseña</h2>

                    {errorPassword && <div className="error-message" style={{ marginBottom: 12 }}>{errorPassword}</div>}
                    {mensajePassword && <div className="success-message" style={{ marginBottom: 12 }}>{mensajePassword}</div>}

                    <div className="form-group">
                        <label className="form-label">Contraseña actual</label>
                        <div className="login-password-wrap">
                            <input
                                type={mostrarActual ? 'text' : 'password'}
                                className="form-input"
                                value={passwordActual}
                                onChange={e => setPasswordActual(e.target.value)}
                                required
                            />
                            <button type="button" className="login-password-toggle" onClick={() => setMostrarActual(!mostrarActual)} tabIndex={-1}>
                                {mostrarActual ? <LuEyeOff size={18} /> : <LuEye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Nueva contraseña</label>
                        <div className="login-password-wrap">
                            <input
                                type={mostrarNueva ? 'text' : 'password'}
                                className="form-input"
                                value={nuevaPassword}
                                onChange={e => setNuevaPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                            <button type="button" className="login-password-toggle" onClick={() => setMostrarNueva(!mostrarNueva)} tabIndex={-1}>
                                {mostrarNueva ? <LuEyeOff size={18} /> : <LuEye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Confirmar nueva contraseña</label>
                        <input
                            type={mostrarNueva ? 'text' : 'password'}
                            className="form-input"
                            value={confirmarPassword}
                            onChange={e => setConfirmarPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>

                    <button type="submit" className="btn-guardar" disabled={guardandoPassword}>
                        {guardandoPassword ? 'Actualizando...' : 'Cambiar contraseña'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Perfil;