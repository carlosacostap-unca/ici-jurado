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
  const [criterios, setCriterios] = useState<RecordModel[]>([]);
  const [evaluaciones, setEvaluaciones] = useState<RecordModel[]>([]);
  const [evaluandoPropuesta, setEvaluandoPropuesta] = useState<RecordModel | null>(null);
  const [puntajes, setPuntajes] = useState<Record<string, number>>({});
  const [isSubmittingEvaluacion, setIsSubmittingEvaluacion] = useState(false);

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
      
      const [propuestasRes, criteriosRes, evaluacionesRes] = await Promise.all([
        pb.collection('propuestas').getFullList({ sort: 'orden' }),
        pb.collection('criterios').getFullList({ sort: 'orden' }),
        pb.collection('evaluaciones').getFullList({ filter: `jurado = "${userId}"` })
      ]);

      setPropuestas(propuestasRes);
      setCriterios(criteriosRes);
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

  const handleAbrirEvaluacion = (propuesta: RecordModel) => {
    setEvaluandoPropuesta(propuesta);
    
    // Buscar si ya hay una evaluación previa para esta propuesta
    const evaluacionPrevia = evaluaciones.find(e => e.propuesta === propuesta.id);
    if (evaluacionPrevia && evaluacionPrevia.puntajes) {
      setPuntajes(evaluacionPrevia.puntajes);
    } else {
      setPuntajes({});
    }
  };

  const handleCerrarEvaluacion = () => {
    setEvaluandoPropuesta(null);
    setPuntajes({});
  };

  const handlePuntajeChange = (criterioId: string, valor: number) => {
    setPuntajes(prev => ({
      ...prev,
      [criterioId]: valor
    }));
  };

  const handleGuardarEvaluacion = async () => {
    if (!user || !evaluandoPropuesta) return;

    // Validar que todos los criterios tengan un puntaje
    const criteriosFaltantes = criterios.filter(c => !puntajes[c.id]);
    if (criteriosFaltantes.length > 0) {
      alert('Por favor, califica todos los criterios antes de guardar.');
      return;
    }

    try {
      setIsSubmittingEvaluacion(true);
      
      const evaluacionExistente = evaluaciones.find(e => e.propuesta === evaluandoPropuesta.id);
      
      const data = {
        jurado: user.id,
        propuesta: evaluandoPropuesta.id,
        puntajes: puntajes
      };

      let evaluacionGuardada: RecordModel;

      if (evaluacionExistente) {
        // Actualizar
        evaluacionGuardada = await pb.collection('evaluaciones').update(evaluacionExistente.id, data);
        setEvaluaciones(prev => prev.map(e => e.id === evaluacionGuardada.id ? evaluacionGuardada : e));
      } else {
        // Crear nueva
        evaluacionGuardada = await pb.collection('evaluaciones').create(data);
        setEvaluaciones(prev => [...prev, evaluacionGuardada]);
      }

      alert('¡Evaluación guardada exitosamente!');
      handleCerrarEvaluacion();
      
    } catch (error: any) {
      console.error("Error al guardar evaluación:", error);
      alert("Hubo un error al guardar la evaluación. " + (error.message || ""));
    } finally {
      setIsSubmittingEvaluacion(false);
    }
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
                        onClick={() => handleAbrirEvaluacion(propuesta)}
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

      {/* Modal de Evaluación */}
      {evaluandoPropuesta && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-700 w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-6 border-b border-slate-800 flex justify-between items-start sticky top-0 bg-slate-900 rounded-t-2xl z-10">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">Evaluación de Propuesta</h2>
                <p className="text-blue-400 font-medium text-sm sm:text-base">{evaluandoPropuesta.titulo}</p>
                <p className="text-slate-400 text-xs sm:text-sm">Expositor: {evaluandoPropuesta.expositor}</p>
              </div>
              <button 
                onClick={handleCerrarEvaluacion}
                className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
              {criterios.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No hay criterios de evaluación registrados en el sistema.
                </div>
              ) : (
                criterios.map((criterio) => (
                  <div key={criterio.id} className="bg-slate-950/50 p-4 sm:p-5 rounded-xl border border-slate-800">
                    <div className="flex gap-3 items-start mb-4">
                      <div className="bg-blue-900/30 text-blue-400 w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 mt-1">
                        {criterio.orden || '-'}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-200 text-lg mb-2">{criterio.titulo}</h3>
                        <div 
                          className="text-sm text-slate-400 quill-content" 
                          dangerouslySetInnerHTML={{ __html: criterio.descripcion }} 
                        />
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-slate-800/50">
                      <label className="block text-sm font-medium text-slate-300 mb-3 text-center sm:text-left">
                        Calificación (1 a 5)
                      </label>
                      <div className="flex justify-center sm:justify-start gap-2 sm:gap-4 flex-wrap">
                        {[1, 2, 3, 4, 5].map((valor) => (
                          <label 
                            key={valor}
                            className={`flex flex-col items-center justify-center w-10 h-10 sm:w-14 sm:h-14 rounded-full cursor-pointer border-2 transition-all ${
                              puntajes[criterio.id] === valor 
                                ? 'border-blue-500 bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' 
                                : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500 hover:bg-slate-800'
                            }`}
                          >
                            <input 
                              type="radio" 
                              name={`criterio-${criterio.id}`} 
                              value={valor}
                              checked={puntajes[criterio.id] === valor}
                              onChange={() => handlePuntajeChange(criterio.id, valor)}
                              className="hidden"
                            />
                            <span className="text-base sm:text-xl font-bold">{valor}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 sm:p-6 border-t border-slate-800 bg-slate-900 rounded-b-2xl sticky bottom-0">
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleCerrarEvaluacion}
                  className="px-4 sm:px-6 py-2.5 rounded-lg font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700 text-sm sm:text-base"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarEvaluacion}
                  disabled={isSubmittingEvaluacion || criterios.length === 0}
                  className="px-4 sm:px-6 py-2.5 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20 text-sm sm:text-base"
                >
                  {isSubmittingEvaluacion ? 'Guardando...' : 'Guardar Evaluación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
