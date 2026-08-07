import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Cierra la sesión automáticamente si el usuario no interactúa con la
 * aplicación durante `minutosInactividad` minutos.
 *
 * Úsalo UNA sola vez, en el layout raíz de las páginas protegidas
 * (ej. tu componente "DashboardLayout" o donde envuelves las rutas
 * privadas), no en cada página individual.
 */
export function useInactividad(minutosInactividad: number = 15) {
    const navigate = useNavigate();
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const cerrarSesionPorInactividad = () => {
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');
            localStorage.removeItem('ultimaActividad');
            alert('Tu sesión se cerró por inactividad. Vuelve a iniciar sesión.');
            navigate('/login');
        };

        const reiniciarTemporizador = () => {
            localStorage.setItem('ultimaActividad', Date.now().toString());

            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(cerrarSesionPorInactividad, minutosInactividad * 60 * 1000);
        };

        // Eventos que cuentan como "actividad" del usuario
        const eventos = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
        eventos.forEach(evento => window.addEventListener(evento, reiniciarTemporizador));

        // Si el usuario cierra la pestaña y vuelve más tarde (ej. la laptop
        // estuvo en suspensión), validamos contra la marca de tiempo guardada.
        const ultimaActividadGuardada = localStorage.getItem('ultimaActividad');
        if (ultimaActividadGuardada) {
            const minutosTranscurridos = (Date.now() - Number(ultimaActividadGuardada)) / 1000 / 60;
            if (minutosTranscurridos >= minutosInactividad) {
                cerrarSesionPorInactividad();
                return;
            }
        }

        reiniciarTemporizador();

        return () => {
            eventos.forEach(evento => window.removeEventListener(evento, reiniciarTemporizador));
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [minutosInactividad, navigate]);
}