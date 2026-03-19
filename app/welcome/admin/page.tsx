"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { pb } from '../../lib/pocketbase';
import type { RecordModel } from 'pocketbase';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

export default function AdminWelcomePage() {
  const router = useRouter();
  const [user, setUser] = useState<RecordModel | null>(null);
  
  // Pestañas
  const [activeTab, setActiveTab] = useState<'propuestas' | 'criterios'>('propuestas');

  // Estados para las propuestas
  const [propuestas, setPropuestas] = useState<RecordModel[]>([]);
  const [titulo, setTitulo] = useState('');
  const [expositor, setExpositor] = useState('');
  const [orden, setOrden] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPropuestas, setIsLoadingPropuestas] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Estados para los criterios
  const [criterios, setCriterios] = useState<RecordModel[]>([]);
  const [criterioTitulo, setCriterioTitulo] = useState('');
  const [criterioDescripcion, setCriterioDescripcion] = useState('');
  const [criterioOrden, setCriterioOrden] = useState<number | ''>('');
  const [isSubmittingCriterio, setIsSubmittingCriterio] = useState(false);
  const [isLoadingCriterios, setIsLoadingCriterios] = useState(true);
  const [editingCriterioId, setEditingCriterioId] = useState<string | null>(null);

  useEffect(() => {
    if (!pb.authStore.isValid || !pb.authStore.model) {
      router.push('/login');
      return;
    }

    if (pb.authStore.model.role !== 'admin') {
      router.push('/welcome/jurado');
      return;
    }

    setUser(pb.authStore.model as RecordModel);

    // Cargar datos al iniciar
    cargarPropuestas();
    cargarCriterios();

    // Escuchar cambios de autenticación
    return pb.authStore.onChange((token, model) => {
      if (!model) {
        router.push('/login');
      } else if (model.role !== 'admin') {
        router.push('/welcome/jurado');
      } else {
        setUser(model as RecordModel);
      }
    });
  }, [router]);

  const cargarPropuestas = async () => {
    try {
      setIsLoadingPropuestas(true);
      const records = await pb.collection('propuestas').getFullList({
        sort: 'orden', // Ordenar por orden de exposición ascendente
      });
      setPropuestas(records);
    } catch (error) {
      console.error("Error al cargar propuestas:", error);
    } finally {
      setIsLoadingPropuestas(false);
    }
  };

  const handleCrearPropuesta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !expositor.trim() || orden === '') return;

    try {
      setIsSubmitting(true);
      const data = {
        titulo: titulo.trim(),
        expositor: expositor.trim(),
        orden: Number(orden)
      };
      
      if (editingId) {
        // Actualizar propuesta existente
        const record = await pb.collection('propuestas').update(editingId, data);
        setPropuestas(propuestas.map(p => p.id === editingId ? record : p).sort((a, b) => (a.orden || 0) - (b.orden || 0)));
        setEditingId(null);
      } else {
        // Crear nueva propuesta
        const record = await pb.collection('propuestas').create(data);
        setPropuestas([...propuestas, record].sort((a, b) => (a.orden || 0) - (b.orden || 0)));
      }
      
      // Limpiar el formulario
      setTitulo('');
      setExpositor('');
      setOrden('');
    } catch (error) {
      console.error("Error al guardar propuesta:", error);
      alert("Hubo un error al guardar la propuesta. Asegúrate de tener los permisos correctos.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (propuesta: RecordModel) => {
    setTitulo(propuesta.titulo);
    setExpositor(propuesta.expositor);
    setOrden(propuesta.orden);
    setEditingId(propuesta.id);
    
    // Scroll al inicio del formulario de manera suave
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setTitulo('');
    setExpositor('');
    setOrden('');
    setEditingId(null);
  };

  const handleEliminarPropuesta = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta propuesta?')) return;
    
    try {
      await pb.collection('propuestas').delete(id);
      setPropuestas(propuestas.filter(p => p.id !== id));
    } catch (error) {
      console.error("Error al eliminar propuesta:", error);
      alert("Hubo un error al eliminar la propuesta.");
    }
  };

  // --- MÉTODOS PARA CRITERIOS ---

  const cargarCriterios = async () => {
    try {
      setIsLoadingCriterios(true);
      const records = await pb.collection('criterios').getFullList({
        sort: 'orden',
      });
      setCriterios(records);
    } catch (error) {
      console.error("Error al cargar criterios:", error);
    } finally {
      setIsLoadingCriterios(false);
    }
  };

  const handleCrearCriterio = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar que el editor no esté vacío (quill suele dejar <p><br></p> cuando está "vacío")
    const isDescripcionEmpty = !criterioDescripcion || criterioDescripcion === '<p><br></p>' || criterioDescripcion === '';
    
    if (!criterioTitulo.trim() || isDescripcionEmpty || criterioOrden === '') {
      alert('Por favor, completa todos los campos del criterio.');
      return;
    }

    try {
      setIsSubmittingCriterio(true);
      const data = {
        titulo: criterioTitulo.trim(),
        descripcion: criterioDescripcion,
        orden: Number(criterioOrden)
      };
      
      if (editingCriterioId) {
        // Actualizar criterio
        const record = await pb.collection('criterios').update(editingCriterioId, data);
        setCriterios(criterios.map(c => c.id === editingCriterioId ? record : c).sort((a, b) => (a.orden || 0) - (b.orden || 0)));
        setEditingCriterioId(null);
      } else {
        // Crear criterio
        const record = await pb.collection('criterios').create(data);
        setCriterios([...criterios, record].sort((a, b) => (a.orden || 0) - (b.orden || 0)));
      }
      
      // Limpiar el formulario
      setCriterioTitulo('');
      setCriterioDescripcion('');
      setCriterioOrden('');
    } catch (error) {
      console.error("Error al guardar criterio:", error);
      alert("Hubo un error al guardar el criterio. Asegúrate de tener los permisos correctos.");
    } finally {
      setIsSubmittingCriterio(false);
    }
  };

  const handleEditCriterioClick = (criterio: RecordModel) => {
    setCriterioTitulo(criterio.titulo);
    setCriterioDescripcion(criterio.descripcion);
    setCriterioOrden(criterio.orden);
    setEditingCriterioId(criterio.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEditCriterio = () => {
    setCriterioTitulo('');
    setCriterioDescripcion('');
    setCriterioOrden('');
    setEditingCriterioId(null);
  };

  const handleEliminarCriterio = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este criterio?')) return;
    
    try {
      await pb.collection('criterios').delete(id);
      setCriterios(criterios.filter(c => c.id !== id));
    } catch (error) {
      console.error("Error al eliminar criterio:", error);
      alert("Hubo un error al eliminar el criterio.");
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
        <div className="font-bold text-lg sm:text-xl text-center sm:text-left">Panel de Administración</div>
        <button
          onClick={handleLogout}
          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-lg transition-colors text-sm w-full sm:w-auto"
        >
          Cerrar Sesión
        </button>
      </nav>
      
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Columna Izquierda: Perfil de Administrador */}
        <div className="md:col-span-1">
          <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 flex flex-col items-center text-center md:sticky md:top-24">
            <div className="mb-4 relative">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={avatarUrl} 
                  alt="Avatar del administrador" 
                  className="w-20 h-20 rounded-full border-4 border-slate-700 object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 text-2xl font-bold border-4 border-slate-700">
                  {user.name?.charAt(0) || user.email?.charAt(0) || 'A'}
                </div>
              )}
              <div className="absolute -bottom-2 -right-2 bg-yellow-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-slate-900">
                ADMIN
              </div>
            </div>
            
            <h1 className="text-xl font-bold text-white mb-1">{user.name || 'Administrador'}</h1>
            <p className="text-slate-400 text-sm mb-6 break-all">{user.email}</p>
          </div>
        </div>

        {/* Columna Derecha: Gestión (Propuestas o Criterios) */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Pestañas */}
          <div className="flex gap-4 border-b border-slate-800 mb-6 pb-2 overflow-x-auto whitespace-nowrap">
            <button 
              onClick={() => setActiveTab('propuestas')}
              className={`font-medium text-lg pb-2 border-b-2 transition-colors ${activeTab === 'propuestas' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
            >
              Propuestas
            </button>
            <button 
              onClick={() => setActiveTab('criterios')}
              className={`font-medium text-lg pb-2 border-b-2 transition-colors ${activeTab === 'criterios' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
            >
              Criterios de Evaluación
            </button>
          </div>

          {activeTab === 'propuestas' ? (
            <>
              {/* Formulario de Creación / Edición Propuesta */}
              <div className="bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-800">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span>📝</span> {editingId ? 'Editar Propuesta' : 'Crear Nueva Propuesta'}
                </h2>
                
                <form onSubmit={handleCrearPropuesta} className="space-y-4">
              <div>
                <label htmlFor="titulo" className="block text-sm font-medium text-slate-300 mb-1">
                  Título de la propuesta
                </label>
                <input
                  type="text"
                  id="titulo"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej: Sistema de Gestión Académica"
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all placeholder-slate-600"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="expositor" className="block text-sm font-medium text-slate-300 mb-1">
                  Nombre del Expositor
                </label>
                <input
                  type="text"
                  id="expositor"
                  value={expositor}
                  onChange={(e) => setExpositor(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all placeholder-slate-600"
                  required
                />
              </div>

              <div>
                <label htmlFor="orden" className="block text-sm font-medium text-slate-300 mb-1">
                  Orden de Exposición
                </label>
                <input
                  type="number"
                  id="orden"
                  value={orden}
                  onChange={(e) => setOrden(e.target.value ? Number(e.target.value) : '')}
                  placeholder="Ej: 1"
                  min="1"
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all placeholder-slate-600"
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Guardando...' : editingId ? 'Actualizar Propuesta' : 'Guardar Propuesta'}
                </button>
                
                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Lista de Propuestas */}
          <div className="bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-800">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span>📋</span> Propuestas Registradas
            </h2>

            {isLoadingPropuestas ? (
              <div className="text-center py-8 text-slate-500">Cargando propuestas...</div>
            ) : propuestas.length === 0 ? (
              <div className="text-center py-8 text-slate-500 bg-slate-950/50 rounded-lg border border-dashed border-slate-700">
                Aún no hay propuestas registradas.
              </div>
            ) : (
              <div className="space-y-3">
                {propuestas.map((propuesta) => (
                  <div 
                    key={propuesta.id} 
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-lg border border-slate-700 hover:border-slate-600 hover:shadow-sm transition-all bg-slate-950/30 gap-4 sm:gap-0"
                  >
                    <div className="flex gap-4 items-start w-full sm:w-auto">
                      <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 mt-1">
                        {propuesta.orden || '-'}
                      </div>
                      <div className="flex-1 sm:flex-initial">
                        <h3 className="font-bold text-slate-200">{propuesta.titulo}</h3>
                        <p className="text-sm text-slate-400 flex items-center gap-1 mt-1">
                          <span>👤</span> {propuesta.expositor}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto justify-end sm:justify-start">
                      <button
                        onClick={() => handleEditClick(propuesta)}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 p-2 rounded-md transition-colors"
                        title="Editar propuesta"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleEliminarPropuesta(propuesta.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-2 rounded-md transition-colors"
                        title="Eliminar propuesta"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
            </>
          ) : (
            <>
              {/* Formulario de Creación / Edición Criterio */}
              <div className="bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-800">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span>📝</span> {editingCriterioId ? 'Editar Criterio' : 'Crear Nuevo Criterio'}
                </h2>
                
                <form onSubmit={handleCrearCriterio} className="space-y-4">
                  <div>
                    <label htmlFor="criterioTitulo" className="block text-sm font-medium text-slate-300 mb-1">
                      Título del criterio
                    </label>
                    <input
                      type="text"
                      id="criterioTitulo"
                      value={criterioTitulo}
                      onChange={(e) => setCriterioTitulo(e.target.value)}
                      placeholder="Ej: Claridad de Exposición"
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all placeholder-slate-600"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="criterioDescripcion" className="block text-sm font-medium text-slate-300 mb-1">
                      Descripción (Guía para el jurado)
                    </label>
                    <div className="bg-slate-950 rounded-lg overflow-hidden border border-slate-700 focus-within:ring-2 focus-within:ring-blue-600 focus-within:border-blue-600 transition-all text-white quill-dark-theme">
                      <ReactQuill 
                        theme="snow"
                        value={criterioDescripcion}
                        onChange={setCriterioDescripcion}
                        placeholder="Ej: Evalúa si el expositor logró transmitir las ideas de manera comprensible..."
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="criterioOrden" className="block text-sm font-medium text-slate-300 mb-1">
                      Orden de Evaluación
                    </label>
                    <input
                      type="number"
                      id="criterioOrden"
                      value={criterioOrden}
                      onChange={(e) => setCriterioOrden(e.target.value ? Number(e.target.value) : '')}
                      placeholder="Ej: 1"
                      min="1"
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all placeholder-slate-600"
                      required
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={isSubmittingCriterio}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmittingCriterio ? 'Guardando...' : editingCriterioId ? 'Actualizar Criterio' : 'Guardar Criterio'}
                    </button>
                    
                    {editingCriterioId && (
                      <button
                        type="button"
                        onClick={handleCancelEditCriterio}
                        className="bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Lista de Criterios */}
              <div className="bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-800">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span>📋</span> Criterios Registrados
                </h2>

                {isLoadingCriterios ? (
                  <div className="text-center py-8 text-slate-500">Cargando criterios...</div>
                ) : criterios.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 bg-slate-950/50 rounded-lg border border-dashed border-slate-700">
                    Aún no hay criterios registrados.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {criterios.map((criterio) => (
                      <div 
                        key={criterio.id} 
                        className="flex flex-col sm:flex-row justify-between items-start p-4 rounded-lg border border-slate-700 hover:border-slate-600 hover:shadow-sm transition-all bg-slate-950/30 gap-4"
                      >
                        <div className="flex gap-4 items-start flex-1 w-full">
                          <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 mt-1">
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
                        <div className="flex gap-2 shrink-0 w-full sm:w-auto justify-end sm:justify-start">
                          <button
                            onClick={() => handleEditCriterioClick(criterio)}
                            className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 p-2 rounded-md transition-colors"
                            title="Editar criterio"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleEliminarCriterio(criterio.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-2 rounded-md transition-colors"
                            title="Eliminar criterio"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
