// src/components/Dashboard.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import CitaDetalleModal from './CitaDetalleModal'
import { formatHoraLegible } from '../lib/datetime'

const STATUS_BADGE = {
  confirmed: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  confirmado: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  pending: 'bg-amber-100 text-amber-800 border border-amber-200',
  agendado: 'bg-sky-100 text-sky-800 border border-sky-200',
  cancelled: 'bg-red-100 text-red-800 border border-red-200',
  cancelado: 'bg-red-100 text-red-800 border border-red-200',
  completado: 'bg-slate-100 text-slate-700 border border-slate-200',
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
    <div className="animate-fade-in-up space-y-6">
      {/* Encabezado Principal */}
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          {saludo}
        </h2>
        <p className="text-xs sm:text-sm font-semibold capitalize text-sky-800/80 mt-0.5">
          {new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Tarjetas de Métricas (KPIs) con iconos SVG minimalistas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Métrica 1 */}
        <div className="rounded-2xl border border-sky-100 bg-linear-to-br from-sky-50/60 to-white p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-800">Citas de Hoy</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-700">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{appointments.length}</span>
            <span className="text-xs font-semibold text-slate-400">atenciones</span>
          </div>
        </div>

        {/* Métrica 2 */}
        <div className="rounded-2xl border border-emerald-100 bg-linear-to-br from-emerald-50/60 to-white p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">Estado de Citas</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-700">{citasConfirmadasHoy}</span>
            <span className="text-sm font-bold text-slate-400">/</span>
            <span className="text-xl font-bold text-amber-600">{citasPendientesHoy}</span>
            <span className="text-[11px] font-semibold text-slate-400">(conf / pend)</span>
          </div>
        </div>

        {/* Métrica 3 */}
        <div className="rounded-2xl border border-purple-100 bg-linear-to-br from-purple-50/60 to-white p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-800">Pacientes Totales</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-700">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{totalPacientes ?? '—'}</span>
            <span className="text-xs font-semibold text-slate-400">registrados</span>
          </div>
        </div>
      </div>

      {/* Botones de Acción Rápida con SVG */}
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <button
          onClick={() => onNavigate?.('agenda')}
          className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-sky-700 cursor-pointer active:scale-95"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Agendar nueva cita
        </button>
        <button
          onClick={() => onNavigate?.('pacientes')}
          className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 cursor-pointer active:scale-95"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Registrar paciente
        </button>
      </div>

      {/* Sección Citas de Hoy */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900">Agenda de Hoy</h3>
            <p className="text-xs text-slate-400">Pacientes programados para la jornada actual</p>
          </div>
          <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">
            {appointments.length} cita{appointments.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loadingAppts ? (
          <div className="space-y-2 py-2">
            <div className="skeleton h-14 w-full rounded-xl" />
            <div className="skeleton h-14 w-full rounded-xl" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center">
            <div className="mb-2 text-slate-300">
              <svg className="mx-auto h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xs font-bold text-slate-700">No tienes citas agendadas para hoy.</p>
            <button
              onClick={() => onNavigate?.('agenda')}
              className="mt-2 text-xs font-bold text-sky-600 hover:text-sky-800 cursor-pointer transition"
            >
              Agendar la primera cita del día →
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {appointments.map((app) => (
              <button
                key={app.id}
                onClick={() => setSelectedAppointment(app)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 text-left transition hover:bg-slate-50 hover:border-slate-300 cursor-pointer"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-sky-100/70 border border-sky-200 font-mono text-xs font-black text-sky-900">
                    {formatHoraLegible(app.start_time)}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="truncate text-xs sm:text-sm font-bold text-slate-900 capitalize">
                        {app.patients?.full_name || 'Paciente desconocido'}
                      </span>
                      <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        app.modalidad === 'domicilio' ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'
                      }`}>
                        {app.modalidad === 'domicilio' ? 'A Domicilio' : 'Presencial'}
                      </span>
                    </div>
                    {app.notas && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">{app.notas}</p>
                    )}
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${STATUS_BADGE[app.status] || 'bg-slate-100 text-slate-700'}`}>
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