// App.jsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Agenda from './components/Agenda';
import Pacientes from './components/Patients';
import Historial from './components/Historial';
import Configuracion from './components/Configuracion';
import Perfil from './components/Perfil';
import Login from './components/Login';
import Onboarding from './components/Onboarding';
import './App.css';

const TAB_TITLES = {
  inicio: 'Inicio',
  agenda: 'Agenda',
  pacientes: 'Pacientes',
  historial: 'Historial Clínico',
  configuracion: 'Configuración',
  perfil: 'Perfil',
};

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inicio');
  const [recordatoriosActivos, setRecordatoriosActivos] = useState(true);

  // Estado para controlar si el menú desplegable (móvil) está abierto o cerrado
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Paciente preseleccionado al entrar a "Historial" desde la ficha de un paciente
  const [historialPatientId, setHistorialPatientId] = useState(null);

  // Perfil del profesional seleccionado en pantalla
  const [profile, setProfile] = useState(null);

  // Lista de perfiles asociados a la cuenta del usuario
  const [equipo, setEquipo] = useState([]);
  const [viewingProfessionalId, setViewingProfessionalId] = useState(null);

  // Método para seleccionar el perfil activo directamente
  const handleSelectProfile = (selectedProfile) => {
    setProfile(selectedProfile);
    if (selectedProfile?.id) {
      setViewingProfessionalId(selectedProfile.id);
      localStorage.setItem('active_profile_id', selectedProfile.id);
    }
  };

  // Carga el equipo/perfiles vinculados a la cuenta desde Supabase
  // Carga el equipo/perfiles vinculados a la cuenta desde Supabase
  const fetchEquipo = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, specialty, user_id')
      .eq('user_id', userId);

    if (error) {
      console.error('Error al cargar equipo/perfiles:', error.message);
      setEquipo([]);
    } else {
      setEquipo(data || []);
      
      // Intentar recuperar el último perfil activo si existe en localStorage
      const savedProfileId = localStorage.getItem('active_profile_id');
      const active = (data || []).find((p) => p.id === savedProfileId);
      
      if (active) {
        setProfile(active);
        setViewingProfessionalId(active.id);
      }
    }
  }, []);
  useEffect(() => {
    // 1. Obtener la sesión actual al cargar la app
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.id) {
        fetchEquipo(session.user.id);
      }
      setLoading(false);
    });

    // 2. Escuchar cambios de autenticación (Login / Logout en tiempo real)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
      if (session?.user?.id) {
        fetchEquipo(session.user.id);
      } else {
        setProfile(null);
        setEquipo([]);
        localStorage.removeItem('active_profile_id');
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchEquipo]);

  const handleLogout = async () => {
    localStorage.removeItem('active_profile_id');
    setProfile(null);
    await supabase.auth.signOut();
  };

  // Se llama desde Patients cuando el usuario aprieta "Ver historial"
  const goToHistorialDePaciente = (patientId) => {
    setHistorialPatientId(patientId);
    setActiveTab('historial');
  };

  // Pantalla de carga mientras se verifica la sesión de Auth
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-600 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
          <span className="text-sm">Cargando tu panel...</span>
        </div>
      </div>
    );
  }

  // 1. Si no hay sesión iniciada -> Pantalla de Login
  if (!session) {
    return <Login />;
  }

  // 2. Si hay sesión pero aún no selecciona un perfil -> Pantalla de Selección (Onboarding)
  if (!profile) {
    return (
      <Onboarding
        session={session}
        onCompleted={(profesionalSeleccionado) => handleSelectProfile(profesionalSeleccionado)}
      />
    );
  }

  const mostrarSelectorEquipo = equipo.length > 1;
  const viendoOtroProfesional = viewingProfessionalId && viewingProfessionalId !== profile.id;
  const nombreProfesionalActivo = equipo.find((p) => p.id === viewingProfessionalId)?.full_name;

  // 3. Si hay sesión y perfil seleccionado -> Panel de Trabajo
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="rounded-md p-2 text-slate-600 transition-colors hover:bg-slate-100 cursor-pointer md:hidden"
              aria-label="Abrir menú"
            >
              ☰
            </button>
            <h1 className="truncate text-base font-semibold text-slate-800 sm:text-lg">
              {TAB_TITLES[activeTab] || 'Panel'}
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            {/* Selector desplegable si el usuario tiene más de un perfil asignado */}
            {mostrarSelectorEquipo && (
              <select
                value={viewingProfessionalId || profile.id}
                onChange={(e) => {
                  const p = equipo.find((item) => item.id === e.target.value);
                  if (p) handleSelectProfile(p);
                }}
                className="hidden max-w-[180px] truncate rounded-md border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-sky-600 sm:block"
              >
                {equipo.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id === profile.id ? `${p.full_name || 'Mi Perfil'} (Activo)` : p.full_name || 'Sin nombre'}
                  </option>
                ))}
              </select>
            )}

            <span className="hidden max-w-[220px] truncate text-sm text-slate-500 sm:inline">
              {profile.full_name || session.user.email}
            </span>

            <button
              onClick={handleLogout}
              className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 cursor-pointer sm:text-sm"
            >
              Cerrar Sesión
            </button>
          </div>
        </header>

        {viendoOtroProfesional && (
          <div className="bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-800 sm:px-6">
            Estás viendo y administrando la información de <strong>{nombreProfesionalActivo}</strong>.{' '}
            <button
              onClick={() => handleSelectProfile(profile)}
              className="underline underline-offset-2 hover:text-amber-900 cursor-pointer"
            >
              Volver a mi perfil
            </button>
          </div>
        )}

        <main key={activeTab} className="tab-content-enter mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6 lg:p-8">
          {activeTab === 'inicio' && (
            <Dashboard
              session={session}
              professionalId={viewingProfessionalId}
              recordatoriosActivos={recordatoriosActivos}
              onNavigate={setActiveTab}
              profile={profile}
            />
          )}
          {activeTab === 'agenda' && (
            <Agenda
              session={session}
              professionalId={viewingProfessionalId}
              recordatoriosActivos={recordatoriosActivos}
              profile={profile}
            />
          )}
          {activeTab === 'pacientes' && (
            <Pacientes session={session} professionalId={viewingProfessionalId} onVerHistorial={goToHistorialDePaciente} />
          )}
          {activeTab === 'historial' && (
            <Historial
              session={session}
              professionalId={viewingProfessionalId}
              initialPatientId={historialPatientId}
              onPatientChange={setHistorialPatientId}
              profile={profile}
            />
          )}
          {activeTab === 'configuracion' && (
            <Configuracion
              session={session}
              profile={profile}
              recordatoriosActivos={recordatoriosActivos}
              setRecordatoriosActivos={setRecordatoriosActivos}
              onProfileSaved={() => fetchEquipo(session.user.id)}
            />
          )}
          {activeTab === 'perfil' && (
            <Perfil session={session} onProfileSaved={() => fetchEquipo(session.user.id)} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;