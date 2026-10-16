// src/components/CitaDetalleModal.jsx

import React from 'react';

export default function CitaDetalleModal({ appointment, onClose, onEdit, onCancelAppointment, profile }) {
  if (!appointment) return null;

  const esDomicilio = appointment.modalidad === 'domicilio';
  const comunaNombre = appointment.comuna || '';
  const direccionExacta = appointment.direccion || '';

  // Solo mostramos la etiqueta limpia sin paréntesis de comuna
  const modalidadLabel = esDomicilio ? '🏠 A Domicilio' : '🏥 Presencial en Consulta';

  const formatFechaLong = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatHora = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '';
    }
  };

  const handleWspClick = () => {
    const phone = appointment.patients?.phone || '';
    if (!phone) {
      alert('El paciente no tiene un número de teléfono registrado.');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const patientName = appointment.patients?.full_name || 'Paciente';
    const fecha = formatFechaLong(appointment.start_time);
    const hora = formatHora(appointment.start_time);

    const mensaje = encodeURIComponent(
      `Hola ${patientName}, te recordamos tu cita podológica agendada para el ${fecha} a las ${hora} hrs. ¡Te esperamos!`
    );

    window.open(`https://wa.me/${cleanPhone}?text=${mensaje}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-3 pt-3 sm:pt-6 backdrop-blur-xs">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 sm:p-6 shadow-2xl animate-fade-in-up">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800">Detalle de la Cita</h3>
            <p className="text-xs text-slate-400">Información completa de la reserva</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer transition"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-3.5 text-xs text-slate-700">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-500">Estado</span>
            <span
              className={`rounded-full px-3 py-0.5 text-[11px] font-bold uppercase ${
                appointment.status === 'confirmed' || appointment.status === 'confirmado'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {appointment.status === 'confirmed' || appointment.status === 'confirmado'
                ? 'CONFIRMADA'
                : 'PENDIENTE'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-500">Paciente</span>
            <span className="font-bold text-slate-900 capitalize">{appointment.patients?.full_name || 'N/A'}</span>
          </div>

          {appointment.patients?.phone && (
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500">Teléfono</span>
              <span className="font-mono text-slate-800">{appointment.patients.phone}</span>
            </div>
          )}

          {appointment.patients?.email && (
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500">Correo</span>
              <span className="text-slate-800">{appointment.patients.email}</span>
            </div>
          )}

          {appointment.servicio && (
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500">Servicio</span>
              <span className="font-bold text-slate-800 capitalize">{appointment.servicio}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-500">Modalidad</span>
            <span className="font-bold text-slate-800 capitalize">{modalidadLabel}</span>
          </div>

          {esDomicilio && comunaNombre && (
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500">Comuna</span>
              <span className="font-bold text-sky-800 capitalize">📍 {comunaNombre}</span>
            </div>
          )}

          {esDomicilio && direccionExacta && (
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500">Dirección</span>
              <span className="font-bold text-slate-900">🏠 {direccionExacta}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-500">Fecha</span>
            <span className="capitalize text-slate-800">{formatFechaLong(appointment.start_time)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-500">Horario</span>
            <span className="font-mono font-bold text-slate-800">
              {formatHora(appointment.start_time)} — {formatHora(appointment.end_time)}
            </span>
          </div>

          {appointment.notas && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <span className="block mb-1 text-[11px] font-bold uppercase text-slate-400">Detalles / Notas:</span>
              <p className="text-slate-700">{appointment.notas}</p>
            </div>
          )}

          <div className="space-y-2 pt-2">
            <button
              onClick={handleWspClick}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 font-bold text-white shadow-sm transition hover:bg-emerald-700 cursor-pointer"
            >
              📲 Enviar recordatorio por WhatsApp
            </button>
            <p className="text-[11px] text-slate-400 text-center">
              ℹ️ Si quieres enviar recordatorios por WSP desde computador, tienes que tener WhatsApp Web abierto.
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-3 flex-wrap">
          <button
            onClick={() => onCancelAppointment(appointment)}
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100 cursor-pointer"
          >
            Cancelar Cita
          </button>
          <button
            onClick={() => onEdit(appointment)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 cursor-pointer"
          >
            Editar
          </button>
          <button
            onClick={onClose}
            className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-sky-700 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}