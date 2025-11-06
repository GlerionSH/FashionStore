import { supabase } from '../database/supabase';

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: any;
  error?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
  fullName: string;
}

/**
 * Registrar un nuevo usuario en Supabase Auth
 */
export async function signup(credentials: SignupCredentials): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: {
          full_name: credentials.fullName,
        },
      },
    });

    if (error) {
      return {
        success: false,
        message: 'Error al registrarse',
        error: error.message,
      };
    }

    return {
      success: true,
      message: 'Registro exitoso. Por favor, verifica tu correo electrónico.',
      user: data.user,
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Error inesperado durante el registro',
      error: err.message,
    };
  }
}

/**
 * Iniciar sesión con email y contraseña
 */
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      return {
        success: false,
        message: 'Error al iniciar sesión',
        error: error.message,
      };
    }

    return {
      success: true,
      message: 'Inicio de sesión exitoso',
      user: data.user,
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Error inesperado durante el inicio de sesión',
      error: err.message,
    };
  }
}

/**
 * Cerrar sesión del usuario actual
 */
export async function logout(): Promise<AuthResponse> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        success: false,
        message: 'Error al cerrar sesión',
        error: error.message,
      };
    }

    return {
      success: true,
      message: 'Sesión cerrada exitosamente',
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Error inesperado al cerrar sesión',
      error: err.message,
    };
  }
}

/**
 * Obtener el usuario actual
 */
export async function getCurrentUser() {
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return null;
    }

    return data.user;
  } catch (err) {
    return null;
  }
}

/**
 * Obtener la sesión actual
 */
export async function getCurrentSession() {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
      return null;
    }

    return data.session;
  } catch (err) {
    return null;
  }
}

/**
 * Restablecer contraseña
 */
export async function resetPassword(email: string): Promise<AuthResponse> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${import.meta.env.PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/reset-password`,
    });

    if (error) {
      return {
        success: false,
        message: 'Error al enviar enlace de restablecimiento',
        error: error.message,
      };
    }

    return {
      success: true,
      message: 'Se ha enviado un enlace de restablecimiento a tu correo electrónico',
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Error inesperado al restablecer contraseña',
      error: err.message,
    };
  }
}

/**
 * Actualizar contraseña
 */
export async function updatePassword(newPassword: string): Promise<AuthResponse> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return {
        success: false,
        message: 'Error al actualizar contraseña',
        error: error.message,
      };
    }

    return {
      success: true,
      message: 'Contraseña actualizada exitosamente',
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Error inesperado al actualizar contraseña',
      error: err.message,
    };
  }
}
