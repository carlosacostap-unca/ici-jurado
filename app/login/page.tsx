"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { pb } from '../lib/pocketbase';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Si ya hay una sesión válida, ir a la pantalla de bienvenida correspondiente
    if (pb.authStore.isValid && pb.authStore.model) {
      const role = pb.authStore.model.role;
      if (role === 'admin') {
        router.push('/welcome/admin');
      } else {
        router.push('/welcome/jurado');
      }
    }
  }, [router]);

  const loginWithGoogle = async () => {
    try {
      setIsLoading(true);
      // Esto abrirá un popup de Google o redirigirá a la página de OAuth
      const authData = await pb.collection('users').authWithOAuth2({ provider: 'google' });
      
      // Si el usuario acaba de ser creado, le asignamos el rol de 'jurado'
      if (authData.meta?.isNew) {
        await pb.collection('users').update(authData.record.id, {
          role: 'jurado'
        });
        
        // Actualizamos el modelo local para que refleje el cambio de inmediato
        authData.record.role = 'jurado';
      }

      if (pb.authStore.isValid && pb.authStore.model) {
        // Obtenemos el rol asegurándonos de tener la versión más actualizada
        const role = authData.record.role || pb.authStore.model.role;
        
        if (role === 'admin') {
          router.push('/welcome/admin');
        } else {
          router.push('/welcome/jurado');
        }
      }
    } catch (error) {
      console.error("Error al iniciar sesión con Google:", error);
      alert("Ocurrió un error durante el inicio de sesión. Revisa la consola para más detalles.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4 sm:px-0">
      <div className="bg-slate-900 p-6 sm:p-8 rounded-2xl shadow-xl shadow-black/30 border border-slate-800 w-full max-w-md flex flex-col items-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 text-center">Iniciar Sesión</h1>
        <p className="text-slate-400 mb-8 text-center text-sm sm:text-base">
          Accede a tu cuenta utilizando tu perfil de Google
        </p>

        <button
          onClick={loginWithGoogle}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 bg-slate-800 border border-slate-700 text-white font-semibold py-3 px-4 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transform duration-100"
        >
          {/* Logo de Google (SVG simple) */}
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {isLoading ? "Conectando..." : "Continuar con Google"}
        </button>
      </div>
    </div>
  );
}
