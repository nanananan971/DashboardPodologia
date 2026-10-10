import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function Onboarding({ session, onCompleted }) {
  const [profesionales, setProfesionales] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (session?.user?.id) {
      cargarProfesionales()
    }
  }, [session])

  const cargarProfesionales = async () => {
    setLoading(true)
    setError('')

    // Consulta los perfiles vinculados a esta cuenta. Un perfil puede estar
    // vinculado de dos formas: por la columna `user_id` (profesionales
    // invitados a un equipo) o porque su propio `id` es el uid de Auth
    // (cuenta individual, ej. cuando el perfil se creó/guardó desde
    // "Perfil" o "Configuración"). Por eso buscamos por ambas columnas;
    // si se busca solo por `user_id`, un perfil creado con
    // `id = session.user.id` y `user_id` vacío no aparece nunca, aunque
    // sí exista (este era el bug de "No hay profesionales registrados").
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, specialty')
      .or(`user_id.eq.${session.user.id},id.eq.${session.user.id}`)

    if (error) {
      console.error('Error cargando profesionales:', error)
      setError('Ocurrió un error al verificar los profesionales asignados a tu cuenta.')
    } else {
      setProfesionales(data || [])
    }
    setLoading(false)
  }

  const handleSeleccionar = (profesional) => {
    if (onCompleted) {
      onCompleted(profesional)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 font-sans">
      <div className="w-full max-w-md animate-fade-in-up rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Seleccionar Profesional</h2>
          <p className="mt-1 text-xs text-slate-500">
            Sesión iniciada como <span className="font-medium text-slate-700">{session?.user?.email}</span>
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-center text-xs text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500">
            <div className="mx-auto mb-2 h-5 w-5 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
            Cargando perfiles disponibles...
          </div>
        ) : profesionales.length === 0 ? (
          <div className="my-4 rounded-lg border border-amber-200 bg-amber-50/60 p-4 text-center">
            <p className="text-xs font-medium text-amber-800">
              No hay profesionales registrados para esta cuenta aún.
            </p>
            <p className="mt-1 text-[11px] text-amber-600">
              Ponte en contacto con el administrador para habilitar tu perfil.
            </p>
          </div>
        ) : (
          <div className="mb-6 space-y-2 max-h-64 overflow-y-auto">
            {profesionales.map((prof) => (
              <button
                key={prof.id}
                onClick={() => handleSeleccionar(prof)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-3 text-left transition-all hover:border-sky-600 hover:bg-sky-50/40 cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-600 text-xs font-semibold text-white">
                    {prof.full_name?.charAt(0).toUpperCase() || 'P'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{prof.full_name || 'Sin nombre'}</p>
                    <p className="text-xs text-slate-400">{prof.specialty || 'Especialista'}</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-sky-600">Ingresar &rarr;</span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-6 text-center border-t border-slate-100 pt-4">
          <button
            onClick={handleLogout}
            className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}