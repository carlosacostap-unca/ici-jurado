"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { pb } from '../../../../lib/pocketbase';
import type { RecordModel } from 'pocketbase';

export default function DetalleRankingPage() {
  const router = useRouter();
  const params = useParams();
  const propuestaId = params.id as string;

  const [propuesta, setPropuesta] = useState<RecordModel | null>(null);
  const [evaluaciones, setEvaluaciones] = useState<RecordModel[]>([]);
  const [criterios, setCriterios] = useState<RecordModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

    cargarDatos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, propuestaId]);

  const cargarDatos = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [propuestaRes, criteriosRes, evaluacionesRes] = await Promise.all([
        pb.collection('propuestas').getOne(propuestaId),
        pb.collection('criterios').getFullList({ sort: 'orden' }),
        pb.collection('evaluaciones').getFullList({ 
          filter: `propuesta = "${propuestaId}"`,
          expand: 'jurado'
        })
      ]);

      setPropuesta(propuestaRes);
      setCriterios(criteriosRes);
      setEvaluaciones(evaluacionesRes);
    } catch (error: any) {
      console.error("Error al cargar detalles de la propuesta:", error);
      setError("No se pudo cargar la información.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVolver = () => {
    router.push('/welcome/jurado');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
        <div className="text-xl font-medium text-slate-400">Cargando detalles...</div>
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
            onClick={handleVolver}
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
            onClick={handleVolver}
            className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-lg transition-colors"
            title="Volver"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </button>
          <div className="font-bold text-lg sm:text-xl text-blue-400">Detalle de Evaluación</div>
        </div>
      </nav>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 pb-24">
        {/* Cabecera de Propuesta */}
        <div className="bg-slate-900 p-5 sm:p-6 rounded-xl border border-slate-800 shadow-sm mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{propuesta.titulo}</h1>
          <div className="flex flex-wrap items-center gap-4 text-slate-400 mt-4">
            <span className="flex items-center gap-1.5 text-slate-300">
              👤 <span className="text-white">{propuesta.expositor}</span>
            </span>
            <span className="px-3 py-1 rounded-full bg-blue-900/30 text-blue-400 border border-blue-800/50 text-sm font-medium">
              {evaluaciones.length} {evaluaciones.length === 1 ? 'Evaluación' : 'Evaluaciones'} recibidas
            </span>
          </div>
        </div>

        {/* Listado de Evaluaciones */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-300 border-b border-slate-800 pb-2">
            Desglose de Evaluaciones
          </h2>

          {evaluaciones.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-slate-900/50 rounded-xl border border-dashed border-slate-800">
              Esta propuesta aún no tiene evaluaciones.
            </div>
          ) : (
            evaluaciones.map((evaluacion, index) => {
              const puntajes = evaluacion.puntajes || {};
              const totalScore = Object.values(puntajes).reduce((acc: number, val: any) => acc + Number(val), 0);
              const juradoData = evaluacion.expand?.jurado;
              const nombreJurado = juradoData?.name || juradoData?.email || 'Jurado Anónimo';
              const avatarUrl = juradoData?.avatar ? pb.files.getURL(juradoData, juradoData.avatar) : null;

              return (
                <div key={evaluacion.id} className="bg-slate-900/80 rounded-xl border border-slate-800 overflow-hidden">
                  {/* Encabezado de la evaluación */}
                  <div className="bg-slate-800/50 p-4 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={avatarUrl} 
                          alt={`Avatar de ${nombreJurado}`} 
                          className="w-10 h-10 rounded-full border border-slate-600 object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold border border-slate-600">
                          {nombreJurado.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="text-sm text-slate-400">Evaluador</div>
                        <div className="font-bold text-slate-200">{nombreJurado}</div>
                      </div>
                    </div>
                    <div className="bg-blue-900/20 px-4 py-2 rounded-lg border border-blue-900/50 text-center">
                      <div className="text-xs text-blue-300/70 mb-0.5">Resultado Total</div>
                      <div className="font-bold text-2xl text-blue-400">{totalScore}</div>
                    </div>
                  </div>

                  {/* Criterios de esta evaluación */}
                  <div className="p-4 sm:p-6 space-y-3">
                    <h3 className="text-sm font-medium text-slate-400 mb-4">Puntajes por criterio:</h3>
                    {criterios.map(criterio => {
                      const puntaje = puntajes[criterio.id];
                      return (
                        <div key={criterio.id} className="flex justify-between items-center py-2 border-b border-slate-800/50 last:border-0">
                          <div className="flex items-center gap-3 pr-4">
                            <span className="text-xs font-mono text-slate-500 bg-slate-950 px-2 py-1 rounded">
                              #{criterio.orden || '-'}
                            </span>
                            <span className="text-slate-300 text-sm sm:text-base">
                              {criterio.titulo}
                            </span>
                          </div>
                          <div className="font-bold text-lg text-slate-200 bg-slate-950 px-3 py-1 rounded border border-slate-800 min-w-[3rem] text-center">
                            {puntaje || '-'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
