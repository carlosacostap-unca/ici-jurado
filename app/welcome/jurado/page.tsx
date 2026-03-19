"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { pb } from '../../lib/pocketbase';
import type { RecordModel } from 'pocketbase';

export default function JuradoWelcomePage() {
  const router = useRouter();
  const [user, setUser] = useState<RecordModel | null>(null);
  
  // Estados para las propuestas
  const [propuestas, setPropuestas] = useState<RecordModel[]>([]);
  const [isLoadingPropuestas, setIsLoadingPropuestas] = useState(true);
  const [errorPropuestas, setErrorPropuestas] = useState<string | null>(null);

  // Estados para la evaluación
  const [evaluaciones, setEvaluaciones] = useState<RecordModel[]>([]);

  useEffect(() => {
    if (!pb.authStore.isValid || !pb.authStore.model) {
      router.push('/login');
      return;
    }

    if (pb.authStore.model.role === 'admin') {
      router.push('/welcome/admin');
      return;
    }

    setUser(pb.authStore.model as RecordModel);

    // Cargar datos al iniciar
    cargarDatos(pb.authStore.model.id);

    // Escuchar cambios de autenticación
    return pb.authStore.onChange((token, model) => {
      if (!model) {
        router.push('/login');
      } else if (model.role === 'admin') {
        router.push('/welcome/admin');
      } else {
        setUser(model as RecordModel);
        cargarDatos(model.id);
      }
    });
  }, [router]);

  const cargarDatos = async (userId: string) => {
    try {
      setIsLoadingPropuestas(true);
      setErrorPropuestas(null);
      
      const [propuestasRes, evaluacionesRes] = await Promise.all([
        pb.collection('propuestas').getFullList({ sort: 'orden' }),
        pb.collection('evaluaciones').getFullList({ filter: `jurado = "${userId}"` })
      ]);

      setPropuestas(propuestasRes);
      setEvaluaciones(evaluacionesRes);
    } catch (error: any) {
      console.error("Error al cargar datos:", error);
      setErrorPropuestas(error.message || "Error desconocido al cargar los datos.");
    } finally {
      setIsLoadingPropuestas(false);
    }
  };

  const handleLogout = () => {
    pb.authStore.clear();
    router.push('/login');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-xl font-medium text-slate-400">Cargando perfil...</div>
      </div>
    );
  }

  const avatarUrl = user.avatar 
    ? pb.files.getURL(user, user.avatar) 
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-200">
      <nav className="bg-slate-900 text-white p-4 flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0 shadow-md border-b border-slate-800 sticky top-0 z-20">
        <div className="font-bold text-lg sm:text-xl text-blue-400 text-center sm:text-left">Portal del Jurado</div>
        <button
          onClick={handleLogout}
          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-lg transition-colors text-sm text-white w-full sm:w-auto"
        >
          Cerrar Sesión
        </button>
      </nav>
      
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Columna Izquierda: Perfil de Jurado */}
        <div className="md:col-span-1">
          <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 flex flex-col items-center text-center md:sticky md:top-24">
            <div className="mb-4 relative">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={avatarUrl} 
                  alt="Avatar del jurado" 
                  className="w-20 h-20 rounded-full border-4 border-blue-500 object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center text-blue-400 text-2xl font-bold border-4 border-blue-500">
                  {user.name?.charAt(0) || user.email?.charAt(0) || 'J'}
                </div>
              )}
              <div className="absolute -bottom-2 -right-2 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-slate-900">
                JURADO
              </div>
            </div>
            
            <h1 className="text-xl font-bold text-white mb-1">{user.name || 'Jurado'}</h1>
            <p className="text-slate-400 text-sm mb-6 break-all">{user.email}</p>

            <div className="w-full bg-blue-900/20 rounded-lg p-4 border border-blue-900/50 text-left">
              <h2 className="font-semibold text-blue-300 mb-2 text-sm">Resumen</h2>
              <div className="flex justify-between items-center text-sm">
                <span className="text-blue-200">Propuestas Totales:</span>
                <span className="font-bold text-blue-300 bg-slate-800 px-2 py-1 rounded-md border border-slate-700">{propuestas.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Lista de Propuestas para Evaluar */}
        <div className="md:col-span-2">
          <div className="bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-800">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <span>📋</span> Propuestas a Evaluar
            </h2>

            {isLoadingPropuestas ? (
              <div className="text-center py-12 text-slate-500">Cargando propuestas...</div>
            ) : errorPropuestas ? (
              <div className="text-center py-8 px-4 text-red-400 bg-red-900/20 rounded-lg border border-red-900/50">
                <p className="font-bold mb-2">Error al cargar las propuestas</p>
                <p className="text-sm mb-4">{errorPropuestas}</p>
                <button 
                  onClick={() => cargarDatos(user.id)}
                  className="bg-red-900/30 hover:bg-red-900/50 text-red-300 border border-red-800 px-4 py-2 rounded-md transition-colors text-sm"
                >
                  Reintentar
                </button>
              </div>
            ) : propuestas.length === 0 ? (
              <div className="text-center py-12 text-slate-500 bg-slate-950/50 rounded-lg border border-dashed border-slate-700">
                Aún no hay propuestas registradas para evaluar.
              </div>
            ) : (
              <div className="space-y-4">
                {propuestas.map((propuesta) => {
                  const yaEvaluada = evaluaciones.some(e => e.propuesta === propuesta.id);

                  return (
                    <div 
                      key={propuesta.id} 
                      className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 sm:p-5 rounded-xl border transition-all bg-slate-950/30 group ${
                        yaEvaluada ? 'border-green-800/50 hover:border-green-600' : 'border-slate-700 hover:border-blue-500'
                      }`}
                    >
                      <div className="flex gap-4 items-start sm:items-center mb-4 sm:mb-0 w-full sm:w-auto">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 border ${
                          yaEvaluada ? 'bg-green-900/30 text-green-400 border-green-800/50' : 'bg-blue-900/50 text-blue-300 border-blue-800'
                        }`}>
                          {propuesta.orden || '-'}
                        </div>
                        <div className="flex-1 sm:flex-initial">
                          <h3 className="font-bold text-lg text-slate-200 group-hover:text-blue-400 transition-colors flex items-center gap-2 flex-wrap">
                            {propuesta.titulo}
                            {yaEvaluada && (
                              <span className="text-xs bg-green-900/40 text-green-400 px-2 py-0.5 rounded-full border border-green-800/50 whitespace-nowrap">
                                Evaluada
                              </span>
                            )}
                          </h3>
                          <p className="text-sm text-slate-400 flex items-center gap-1 mt-1">
                            <span>👤</span> Expositor: {propuesta.expositor}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => router.push(`/welcome/jurado/evaluar/${propuesta.id}`)}
                        className={`w-full sm:w-auto font-medium py-2 px-5 rounded-lg transition-all border ${
                          yaEvaluada 
                            ? 'bg-slate-800/50 hover:bg-slate-700 text-slate-300 border-slate-700' 
                            : 'bg-blue-900/20 hover:bg-blue-600 text-blue-300 hover:text-white border-blue-800 hover:border-transparent'
                        }`}
                      >
                        {yaEvaluada ? 'Editar Evaluación' : 'Evaluar'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
