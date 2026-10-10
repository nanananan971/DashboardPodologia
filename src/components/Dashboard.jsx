// src/components/Dashboard.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import CitaDetalleModal from './CitaDetalleModal'
import { formatHoraLegible } from '../lib/datetime'

const STATUS_BADGE = {
  confirmed: 'bg-emerald-50 text-emerald-700',
  confirmado: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  agendado: 'bg-sky-50 text-sky-700',
  cancelled: 'bg-red-50 text-red-700',
  cancelado: 'bg-red-50 text-red-700',
  completado: 'bg-slate-100 text-slate-700',
}

export default function Dashboard({ session, professionalId, onNavigate, profile }) {
  const activeProfessionalId = professionalId || session?.user?.id

  const [appointments, setAppointments] = useState([])
  const [loadingAppts, setLoadingAppts] = useState(true)
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [totalPacientes, setTotalPacientes] = useState(null)

  useEffect(() => {
    if (activeProfessionalId) {
      fetchTodayAppointments()
      fetchTotalPacientes()
    }
  }, [activeProfessionalId])

  const fetchTodayAppointments = async () => {
    setLoadingAppts(true)

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    const { data, error } = await supabase
      .from('appointments')
      .select('*, patients (full_name, phone, email)')
      .eq('professional_id', activeProfessionalId)
      .gte('start_time', startOfDay.toISOString())
      .lte('start_time', endOfDay.toISOString())
      .order('start_time', { ascending: true })

    if (error) {
      console.error('Error al cargar citas de hoy:', error.message)
    } else {
      setAppointments(data || [])
    }
    setLoadingAppts(false)
  }

  const fetchTotalPacientes = async () => {
    const { count, error } = await supabase
      .from('patients')
      .select('id', { count: 'exact', head: true })
      .eq('professional_id', activeProfessionalId)

    if (!error) setTotalPacientes(count ?? 0)
  }

  const handleEditFromDetail = () => {
    setSelectedAppointment(null)
    onNavigate?.('agenda')
  }

  const handleCancelFromDetail = async (appointment) => {
    const { error } = await supabase.from('appointments').delete().eq('id', appointment.id)
    if (error) {
      console.error('Error al cancelar la cita:', error.message)
    } else {
      setSelectedAppointment(null)
      fetchTodayAppointments()
    }
  }

  const citasConfirmadasHoy = appointments.filter(
    (a) => a.status === 'confirmed' || a.status === 'confirmado'
  ).length
  const citasPendientesHoy = appointments.filter(
    (a) => a.status === 'pending' || a.status === 'agendado'
  ).length

  const saludo = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 19) return 'Buenas tardes'
    return 'Buenas noches'
  })()

  return (
    <div className="animate-fade-in-up space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
          {saludo}
        </h2>
        <p className="text-sm capitalize text-slate-500">
          {new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Tarjetas de resumen en columna para móvil, 3 columnas en desktop */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Citas de hoy</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">{appointments.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Confirmadas / Pendientes</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">
            {citasConfirmadasHoy} <span className="text-base font-medium text-slate-400">/</span> {citasPendientesHoy}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pacientes registrados</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">{totalPacientes ?? '—'}</p>
        </div>
      </div>

      {/* Accesos rápidos adaptados a móvil (botones en bloque o flex wrap) */}
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <button
          onClick={() => onNavigate?.('agenda')}
          className="w-full rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-700 cursor-pointer sm:w-auto"
        >
          + Agendar nueva cita
        </button>
        <button
          onClick={() => onNavigate?.('pacientes')}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer sm:w-auto"
        >
          + Registrar paciente
        </button>
      </div>

      {/* Resumen de citas de hoy */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800">Citas de Hoy</h3>
          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
            {appointments.length} cita{appointments.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loadingAppts ? (
          <div className="space-y-2 py-2">
            <div className="skeleton h-12 w-full" />
            <div className="skeleton h-12 w-full" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center">
            <p className="text-sm text-slate-500">No tienes citas agendadas para hoy.</p>
            <button
              onClick={() => onNavigate?.('agenda')}
              className="mt-3 text-sm font-semibold text-sky-600 hover:text-sky-700 cursor-pointer"
            >
              Agendar la primera cita del día →
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {appointments.map((app) => (
              <button
                key={app.id}
                onClick={() => setSelectedAppointment(app)}
                className="flex w-full items-center justify-between gap-3 py-3 text-left transition-colors hover:bg-slate-50 active:bg-slate-100 cursor-pointer"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-14 shrink-0 font-mono text-xs font-bold text-slate-700 sm:text-sm">
                    {formatHoraLegible(app.start_time)}
                  </span>
                  <span className="truncate text-sm font-semibold text-slate-900">
                    {app.patients?.full_name || 'Paciente desconocido'}
                  </span>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[app.status] || 'bg-slate-100 text-slate-700'}`}>
                  {app.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedAppointment && (
        <CitaDetalleModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onEdit={handleEditFromDetail}
          onCancelAppointment={handleCancelFromDetail}
          profile={profile}
        />
      )}
    </div>
  )
}