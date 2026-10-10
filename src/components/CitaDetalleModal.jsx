// src/components/CitaDetalleModal.jsx
// Tarjeta/modal reutilizable que muestra el detalle completo de una cita.
// Se usa tanto desde el Dashboard (inicio) como desde la Agenda (calendario).
//
// NOTA IMPORTANTE SOBRE EL NOMBRE DE ESTE ARCHIVO:
// Antes se llamaba "CitaDetallemodal.jsx" pero se importaba en otros
// componentes como `import CitaDetallemodal from './CitaDetallemodal'` y
// luego se usaba en el JSX como `<CitaDetalleModal .../>` (con M mayúscula).
// Como JavaScript distingue mayúsculas de minúsculas, esa "M" vs "m" hacía
// que la app tirara un error "CitaDetalleModal is not defined" apenas
// alguien intentaba abrir el detalle de una cita. Ya está corregido en
// Dashboard.jsx y Agenda.jsx: ahora todos importan `CitaDetalleModal`
// (con M mayúscula) desde este mismo archivo.

import { formatFechaLegible, formatHoraLegible } from '../lib/datetime'

const STATUS_INFO = {
  confirmed: { label: 'Confirmada', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  confirmado: { label: 'Confirmada', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending: { label: 'Pendiente', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  agendado: { label: 'Agendada', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  cancelled: { label: 'Cancelada', className: 'bg-red-50 text-red-700 border-red-200' },
  cancelado: { label: 'Cancelada', className: 'bg-red-50 text-red-700 border-red-200' },
  completado: { label: 'Completada', className: 'bg-slate-100 text-slate-700 border-slate-200' },
}

export default function CitaDetalleModal({ appointment, onClose, onEdit, onCancelAppointment, profile }) {
  if (!appointment) return null

  const patient = appointment.patients || {}
  const statusInfo = STATUS_INFO[appointment.status] || {
    label: appointment.status || 'Sin estado',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  }
  const isCancelled = appointment.status === 'cancelled' || appointment.status === 'cancelado'

  // Arma el link de WhatsApp con el mensaje de recordatorio ya redactado,
  // usando el nombre de la clínica y del profesional configurados en
  // "Configuración". Si el paciente no tiene teléfono registrado, no hay
  // link (el botón queda deshabilitado).
  const buildWhatsappLink = () => {
    const telefono = (patient.phone || '').replace(/\D/g, '')
    if (!telefono) return null

    const clinica = profile?.clinic_name || 'nuestra clínica'
    const profesional = profile?.full_name || 'tu profesional'
    const mensaje =
      `Hola ${patient.full_name || ''}, te recordamos tu cita agendada para el día ` +
      `${formatFechaLegible(appointment.start_time)} a las ${formatHoraLegible(appointment.start_time)} ` +
      `en ${clinica} con el profesional ${profesional}. ¡Te esperamos!`

    return `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`
  }

  const whatsappLink = buildWhatsappLink()

  return (
    <div
      className="animate-overlay fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="animate-modal-sheet max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle visual para indicar "arrastrar" en móvil */}
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden" />

        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Detalle de la Cita</h3>
            <p className="text-xs text-slate-500">Información completa de la reserva</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <span className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${statusInfo.className}`}>
          {statusInfo.label}
        </span>

        <div className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
            <span className="text-slate-500">Paciente</span>
            <span className="text-right font-medium text-slate-900">{patient.full_name || 'Paciente desconocido'}</span>
          </div>

          {patient.phone && (
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
              <span className="text-slate-500">Teléfono</span>
              <span className="text-right font-medium text-slate-900">{patient.phone}</span>
            </div>
          )}

          {patient.email && (
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
              <span className="text-slate-500">Correo</span>
              <span className="text-right font-medium text-slate-900">{patient.email}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
            <span className="text-slate-500">Fecha</span>
            <span className="text-right font-medium text-slate-900">{formatFechaLegible(appointment.start_time)}</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Horario</span>
            <span className="text-right font-medium text-slate-900">
              {formatHoraLegible(appointment.start_time)} — {formatHoraLegible(appointment.end_time)}
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 p-3.5">
          <a
            href={whatsappLink || undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!whatsappLink}
            onClick={(e) => {
              if (!whatsappLink) e.preventDefault()
            }}
            className={`flex w-full items-center justify-center gap-2 rounded-md px-3.5 py-2.5 text-sm font-medium transition-colors sm:py-2 ${
              whatsappLink
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer'
                : 'cursor-not-allowed bg-slate-100 text-slate-400'
            }`}
          >
            📲 Enviar recordatorio por WhatsApp
          </a>
          {!whatsappLink && (
            <p className="mt-2 text-xs text-slate-400">
              Este paciente no tiene un teléfono registrado.
            </p>
          )}
          <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
            ℹ️ Si quieres enviar recordatorios por WSP desde computador, tienes que tener WhatsApp Web abierto.
          </p>
        </div>

        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          {onCancelAppointment && !isCancelled && (
            <button
              onClick={() => onCancelAppointment(appointment)}
              className="rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 cursor-pointer sm:py-2"
            >
              Cancelar Cita
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(appointment)}
              className="rounded-md border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 cursor-pointer sm:py-2"
            >
              Editar
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-md bg-sky-600 px-3.5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-700 cursor-pointer sm:py-2"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
