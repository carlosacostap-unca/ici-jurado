"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { pb } from '../../../../lib/pocketbase';
import type { RecordModel } from 'pocketbase';

export default function EvaluarPropuestaPage() {
  const router = useRouter();
  const params = useParams();
  const propuestaId = params.id as string;

  const [user, setUser] = useState<RecordModel | null>(null);
  const [propuesta, setPropuesta] = useState<RecordModel | null>(null);
  const [criterios, setCriterios] = useState<RecordModel[]>([]);
  const [evaluacionExistente, setEvaluacionExistente] = useState<RecordModel | null>(null);
  const [puntajes, setPuntajes] = useState<Record<string, number>>({});
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingEvaluacion, setIsSubmittingEvaluacion] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    cargarDatos(pb.authStore.model.id);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, propuestaId]);

  const cargarDatos = async (userId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const [propuestaRes, criteriosRes, evaluacionesRes] = await Promise.all([
        pb.collection('propuestas').getOne(propuestaId),
        pb.collection('criterios').getFullList({ sort: 'orden' }),
        pb.collection('evaluaciones').getFullList({ filter: `jurado = "${userId}" && propuesta = "${propuestaId}"` })
      ]);

      setPropuesta(propuestaRes);
      setCriterios(criteriosRes);

      if (evaluacionesRes.length > 0) {
        const evalPrevia = evaluacionesRes[0];
        setEvaluacionExistente(evalPrevia);
        if (evalPrevia.puntajes) {
          setPuntajes(evalPrevia.puntajes);
        }
      }
    } catch (error: any) {
      console.error("Error al cargar datos de evaluación:", error);
      setError("No se pudo cargar la información de la propuesta.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePuntajeChange = (criterioId: string, valor: number) => {
    setPuntajes(prev => ({
      ...prev,
      [criterioId]: valor
    }));
  };

  const handleGuardarEvaluacion = async () => {
    if (!user || !propuesta) return;

    // Validar que todos los criterios tengan un puntaje
    const criteriosFaltantes = criterios.filter(c => !puntajes[c.id]);
    if (criteriosFaltantes.length > 0) {
      alert('Por favor, califica todos los criterios antes de guardar.');
      return;
    }

    try {
      setIsSubmittingEvaluacion(true);
      
      const data = {
        jurado: user.id,
        propuesta: propuesta.id,
        puntajes: puntajes
      };

      if (evaluacionExistente) {
        // Actualizar
        await pb.collection('evaluaciones').update(evaluacionExistente.id, data);
      } else {
        // Crear nueva
        await pb.collection('evaluaciones').create(data);
      }

      router.push('/welcome/jurado');
      
    } catch (error: any) {
      console.error("Error al guardar evaluación:", error);
      alert("Hubo un error al guardar la evaluación. " + (error.message || ""));
    } finally {
      setIsSubmittingEvaluacion(false);
    }
  };

  const handleCancelar = () => {
    router.push('/welcome/jurado');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
        <div className="text-xl font-medium text-slate-400">Cargando evaluación...</div>
      </div>
    );
  }

  if (error || !propuesta) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-200 p-4">
        <div className="bg-slate-900 p-8 rounded-2xl border border-red-800 text-center max-w-md w-full">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Error</h2>
          <p className="text-slate-300 mb-6">{error || "Propuesta no encontrada."}</p>
          <button 
            onClick={handleCancelar}
            className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-lg transition-colors border border-slate-700 w-full"
          >
            Volver al Panel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col">
      <nav className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-md border-b border-slate-800 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleCancelar}
            className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-lg transition-colors"
            title="Volver"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </button>
          <div className="font-bold text-lg sm:text-xl text-blue-400">Portal del Jurado</div>
        </div>
      </nav>

      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 pb-32">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Evaluación de Propuesta</h1>
          <div className="bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-800 mt-4">
            <h2 className="text-xl text-blue-400 font-medium mb-1">{propuesta.titulo}</h2>
            <p className="text-slate-400 text-sm sm:text-base flex items-center gap-2">
              <span>👤</span> Expositor: {propuesta.expositor}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {criterios.length === 0 ? (
            <div className="text-center py-8 text-slate-500 bg-slate-900 rounded-xl border border-slate-800">
              No hay criterios de evaluación registrados en el sistema.
            </div>
          ) : (
            criterios.map((criterio) => (
              <div key={criterio.id} className="bg-slate-900 p-4 sm:p-6 rounded-xl border border-slate-800 shadow-sm">
                <div className="flex gap-3 items-start mb-4">
                  <div className="bg-blue-900/30 text-blue-400 w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 mt-1">
                    {criterio.orden || '-'}
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <h3 className="font-bold text-slate-200 text-lg mb-2 break-words">{criterio.titulo}</h3>
                    <div 
                      className="text-sm text-slate-400 quill-content w-full" 
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
                        className={`flex flex-col items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full cursor-pointer border-2 transition-all ${
                          puntajes[criterio.id] === valor 
                            ? 'border-blue-500 bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' 
                            : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-500 hover:bg-slate-800'
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
                        <span className="text-lg sm:text-xl font-bold">{valor}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Barra inferior fija para acciones */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 p-4 sm:p-6 z-30">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row justify-end gap-3">
          <button
            onClick={handleCancelar}
            className="px-4 sm:px-6 py-3 sm:py-2.5 rounded-lg font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700 text-sm sm:text-base w-full sm:w-auto order-2 sm:order-1"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardarEvaluacion}
            disabled={isSubmittingEvaluacion || criterios.length === 0}
            className="px-4 sm:px-6 py-3 sm:py-2.5 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20 text-sm sm:text-base w-full sm:w-auto order-1 sm:order-2"
          >
            {isSubmittingEvaluacion ? 'Guardando...' : 'Guardar Evaluación'}
          </button>
        </div>
      </div>
    </div>
  );
}
