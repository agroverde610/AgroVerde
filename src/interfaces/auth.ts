export interface LoginRequest {
    usuario: string;
    clave: string;
}

export interface LoginResponse {
    success: boolean;
    mensaje: string;
    data?: {
        id: number;
        nombre: string;
        rol: string;
    };
}
export interface UsuarioLogueado {
    id: number;
    nombre: string;
    username: string;
    rol: string;
    rolId: number;
}