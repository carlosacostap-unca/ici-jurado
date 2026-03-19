"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { pb } from '../../lib/pocketbase';
import type { RecordModel } from 'pocketbase';

function JuradoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<RecordModel | null>(null);
  
  // Estados para las propuestas
  const [propuestas, setPropuestas] = useState<RecordModel[]>([]);
  const [isLoadingPropuestas, setIsLoadingPropuestas] = useState(true);
  const [errorPropuestas, setErrorPropuestas] = useState<string | null>(null);

  // Estados para la evaluación
  const [evaluaciones, setEvaluaciones] = useState<RecordModel[]>([]);
  const [criterios, setCriterios] = useState<RecordModel[]>([]);

  // Pestaña activa
  const [activeTab, setActiveTab] = useState<'propuestas' | 'ranking'>('propuestas');

  useEffect(() => {
    // Si viene el parámetro tab en la URL, lo usamos
    const tabParam = searchParams.get('tab');
    if (tabParam === 'ranking' || tabParam === 'propuestas') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

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
      
      const [propuestasRes, evaluacionesRes, criteriosRes] = await Promise.all([
        pb.collection('propuestas').getFullList({ sort: 'orden' }),
        pb.collection('evaluaciones').getFullList({ filter: `jurado = "${userId}"` }),
        pb.collection('criterios').getFullList({ sort: 'orden' })
      ]);

      setPropuestas(propuestasRes);
      setEvaluaciones(evaluacionesRes);
      setCriterios(criteriosRes);
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
      <nav className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-md border-b border-slate-800 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo_ftyca_blanco_128.png" alt="Logo" className="w-8 h-8 object-contain" />
          <div className="font-bold text-lg sm:text-xl text-white">Investigación con impacto</div>
        </div>
        <button
          onClick={handleLogout}
          className="hidden lg:block bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-lg transition-colors text-sm text-white"
        >
          Cerrar Sesión
        </button>
      </nav>
      
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 pb-24 lg:pb-6 grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <div className="flex justify-between items-center text-sm">
                <span className="text-blue-200">Avance de Evaluación:</span>
                <span className="font-bold text-blue-300 bg-slate-800 px-2 py-1 rounded-md border border-slate-700">
                  {propuestas.filter(p => evaluaciones.some(e => e.propuesta === p.id)).length} / {propuestas.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Contenido Principal */}
        <div className="md:col-span-2">
          
          {/* Pestañas (Desktop) */}
          <div className="hidden lg:flex gap-4 border-b border-slate-800 mb-6 pb-2">
            <button 
              onClick={() => setActiveTab('propuestas')}
              className={`font-medium text-lg pb-2 border-b-2 transition-colors ${activeTab === 'propuestas' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
            >
              Propuestas
            </button>
            <button 
              onClick={() => setActiveTab('ranking')}
              className={`font-medium text-lg pb-2 border-b-2 transition-colors ${activeTab === 'ranking' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
            >
              Orden de mérito
            </button>
          </div>

          <div className="bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-800">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              {activeTab === 'propuestas' ? (
                <><span>📋</span> Propuestas a Evaluar</>
              ) : (
                <><span>🏆</span> Mi Orden de Mérito</>
              )}
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
                Aún no hay propuestas registradas.
              </div>
            ) : activeTab === 'propuestas' ? (
              <div className="space-y-4">
                {propuestas.map((propuesta) => {
                  const evaluacion = evaluaciones.find(e => e.propuesta === propuesta.id);
                  const yaEvaluada = !!evaluacion;
                  
                  // Verificar si la evaluación está completa
                  let isCompleta = false;
                  if (yaEvaluada && evaluacion.puntajes) {
                    const puntajes = evaluacion.puntajes;
                    const criteriosEvaluados = criterios.filter(c => puntajes[c.id]).length;
                    isCompleta = criterios.length > 0 && criteriosEvaluados === criterios.length;
                  }

                  return (
                    <div 
                      key={propuesta.id} 
                      className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 sm:p-5 rounded-xl border transition-all bg-slate-950/30 group ${
                        yaEvaluada 
                          ? isCompleta 
                            ? 'border-green-800/50 hover:border-green-600' 
                            : 'border-yellow-800/50 hover:border-yellow-600'
                          : 'border-slate-700 hover:border-blue-500'
                      }`}
                    >
                      <div className="flex gap-4 items-start sm:items-center mb-4 sm:mb-0 w-full sm:w-auto">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 border ${
                          yaEvaluada 
                            ? isCompleta
                              ? 'bg-green-900/30 text-green-400 border-green-800/50' 
                              : 'bg-yellow-900/30 text-yellow-400 border-yellow-800/50'
                            : 'bg-blue-900/50 text-blue-300 border-blue-800'
                        }`}>
                          {propuesta.orden || '-'}
                        </div>
                        <div className="flex-1 sm:flex-initial">
                          <h3 className="font-bold text-lg text-slate-200 group-hover:text-blue-400 transition-colors flex items-center gap-2 flex-wrap">
                            {propuesta.titulo}
                          </h3>
                          <div className="mt-1 flex flex-col items-start gap-2">
                            <p className="text-sm text-white flex items-center gap-1">
                              <span>👤</span> Expositor: {propuesta.expositor}
                            </p>
                            {yaEvaluada && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap ${
                                isCompleta
                                  ? 'bg-green-900/40 text-green-400 border-green-800/50'
                                  : 'bg-yellow-900/40 text-yellow-400 border-yellow-800/50'
                              }`}>
                                {isCompleta ? 'Evaluación Completa' : 'Incompleta'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => router.push(`/welcome/jurado/evaluar/${propuesta.id}`)}
                        className={`w-full sm:w-auto font-medium py-2 px-5 rounded-lg transition-all border ${
                          yaEvaluada 
                            ? isCompleta
                              ? 'bg-slate-800/50 hover:bg-slate-700 text-slate-300 border-slate-700' 
                              : 'bg-yellow-900/20 hover:bg-yellow-600 text-yellow-300 hover:text-white border-yellow-800 hover:border-transparent'
                            : 'bg-blue-900/20 hover:bg-blue-600 text-blue-300 hover:text-white border-blue-800 hover:border-transparent'
                        }`}
                      >
                        {yaEvaluada 
                          ? isCompleta 
                            ? 'Editar Evaluación' 
                            : 'Continuar Evaluación'
                          : 'Evaluar'}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4">
                {(() => {
                  const rankingData = propuestas
                    .map(propuesta => {
                      const evaluacion = evaluaciones.find(e => e.propuesta === propuesta.id);
                      const puntajes = evaluacion?.puntajes || {};
                      const totalScore = Object.values(puntajes).reduce((acc: number, val: any) => acc + Number(val), 0);
                      
                      let isCompleta = false;
                      if (evaluacion && evaluacion.puntajes) {
                        const criteriosEvaluados = criterios.filter(c => puntajes[c.id]).length;
                        isCompleta = criterios.length > 0 && criteriosEvaluados === criterios.length;
                      }

                      return {
                        ...propuesta,
                        totalScore,
                        isCompleta,
                        yaEvaluada: !!evaluacion,
                        titulo: propuesta.titulo,
                        expositor: propuesta.expositor
                      };
                    })
                    .filter(p => p.yaEvaluada)
                    .sort((a, b) => b.totalScore - a.totalScore);

                  if (rankingData.length === 0) {
                    return (
                      <div className="text-center py-12 text-slate-500 bg-slate-950/50 rounded-lg border border-dashed border-slate-700">
                        Aún no has evaluado ninguna propuesta.
                      </div>
                    );
                  }

                  return rankingData.map((propuesta, index) => (
                    <div 
                      key={propuesta.id} 
                      onClick={() => router.push(`/welcome/jurado/ranking/${propuesta.id}`)}
                      className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl border border-slate-800 bg-slate-950/30 cursor-pointer hover:bg-slate-900 transition-colors group"
                    >
                      <div className="flex gap-4 items-center mb-3 sm:mb-0 w-full sm:w-auto">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 bg-blue-900/30 text-blue-400 border border-blue-800/50 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          #{index + 1}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-200">{propuesta.titulo}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-slate-400">👤 {propuesta.expositor}</span>
                            {!propuesta.isCompleta && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full border bg-yellow-900/40 text-yellow-400 border-yellow-800/50">
                                Incompleta
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="bg-slate-900 px-4 py-2 rounded-lg border border-slate-800 text-center min-w-[100px]">
                        <div className="text-xs text-slate-400 mb-0.5">Puntaje</div>
                        <div className="font-bold text-xl text-blue-400">{propuesta.totalScore}</div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Menú Inferior (Móvil < 1024px) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-50 flex justify-around items-center pb-[env(safe-area-inset-bottom)]">
        <button 
          onClick={() => setActiveTab('propuestas')}
          className={`flex-1 flex flex-col items-center py-3 ${activeTab === 'propuestas' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-300'}`}
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <span className="text-[10px] font-medium">Propuestas</span>
        </button>
        <button 
          onClick={() => setActiveTab('ranking')}
          className={`flex-1 flex flex-col items-center py-3 ${activeTab === 'ranking' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-300'}`}
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12v8M15 8v12M3 16v4h18v-4M9 12H5a2 2 0 00-2 2v2M15 8h-4a2 2 0 00-2 2v2M19 12h-4" />
            <text x="6" y="21" fontSize="5" fill="currentColor" stroke="none" textAnchor="middle">2</text>
            <text x="12" y="17" fontSize="5" fill="currentColor" stroke="none" textAnchor="middle">1</text>
            <text x="18" y="21" fontSize="5" fill="currentColor" stroke="none" textAnchor="middle">3</text>
            <rect x="4" y="12" width="4" height="8" stroke="currentColor" fill="none" strokeWidth={1.5} />
            <rect x="10" y="8" width="4" height="12" stroke="currentColor" fill="none" strokeWidth={1.5} />
            <rect x="16" y="14" width="4" height="6" stroke="currentColor" fill="none" strokeWidth={1.5} />
          </svg>
          <span className="text-[10px] font-medium text-center leading-tight">Orden de<br/>mérito</span>
        </button>
        <button 
          onClick={handleLogout}
          className="flex-1 flex flex-col items-center py-3 text-red-400 hover:text-red-300"
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="text-[10px] font-medium">Salir</span>
        </button>
      </div>
    </div>
  );
}

export default function JuradoWelcomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-xl font-medium text-slate-400">Cargando panel...</div>
      </div>
    }>
      <JuradoContent />
    </Suspense>
  );
}
