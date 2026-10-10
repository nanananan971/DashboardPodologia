// src/components/Agenda.jsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import CitaDetalleModal from './CitaDetalleModal';
import {
  formatLocalDateStr,
  formatLocalTimeStr,
  formatLocalDateTimeStr,
  localInputToUTCISOString,
  addMinutesToISOString,
  timeStrToMinutes,
  getDayName,
} from '../lib/datetime';

const getTodayLocalStr = () => formatLocalDateStr(new Date());

const getCurrentLocalDateTimeMin = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}`;
};

export default function Agenda({ session, professionalId, profile }) {
  const [activeTab, setActiveTab] = useState('calendar');
  const [calendarView, setCalendarView] = useState('day'); 

  const [appointments, setAppointments] = useState([]);
  const [loadingAppts, setLoadingAppts] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getTodayLocalStr());
  const [currentDateObj, setCurrentDateObj] = useState(new Date());

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [currentAppt, setCurrentAppt] = useState({ id: '', patient_id: '', start_time: '', end_time: '', status: 'confirmed' });

  const [patients, setPatients] = useState([]);
  const [patientMode, setPatientMode] = useState('existing');
  const [newPatientData, setNewPatientData] = useState({ full_name: '', phone: '', email: '' });
  const [savingAppt, setSavingAppt] = useState(false);

  const [availability, setAvailability] = useState([]);
  const [availMode, setAvailMode] = useState('range_days');
  const [newAvail, setNewAvail] = useState({
    start_day: 1,
    end_day: 5,
    single_day: 1,
    start_time: '09:00',
    end_time: '18:00',
    slot_duration_minutes: 30,
    interval_minutes: 0,
    valid_from: '',
    valid_until: '',
    is_permanent_schedule: true
  });

  const user = session?.user || null;
  const activeProfessionalId = professionalId || user?.id;
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  useEffect(() => {
    if (activeProfessionalId) {
      loadAppointments(activeProfessionalId);
      loadAvailability(activeProfessionalId);
      loadPatients(activeProfessionalId);
    }
  }, [activeProfessionalId]);

  const openAppointmentDetail = (appointment) => setSelectedAppointment(appointment);

  const handleEditFromDetail = (appointment) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentAppt({
      id: appointment.id,
      patient_id: appointment.patient_id,
      start_time: formatLocalDateTimeStr(new Date(appointment.start_time)),
      end_time: appointment.end_time,
      status: appointment.status
    });
    setPatientMode('existing');
    setModalMode('edit');
    setSelectedAppointment(null);
    setShowModal(true);
  };

  const handleCancelFromDetail = async (appointment) => {
    await handleDeleteAppointment(appointment.id);
    setSelectedAppointment(null);
  };

  const loadAppointments = async (userId) => {
    setLoadingAppts(true);
    const { data, error } = await supabase
      .from('appointments')
      .select('*, patients (full_name, phone, email)')
      .eq('professional_id', userId)
      .order('start_time', { ascending: true });
    if (error) console.error('Error al cargar citas:', error.message);
    setAppointments(data || []);
    setLoadingAppts(false);
  };

  const loadAvailability = async (userId) => {
    const { data } = await supabase.from('availability').select('*').eq('professional_id', userId);
    setAvailability(data || []);
  };

  const loadPatients = async (userId) => {
    const { data, error } = await supabase
      .from('patients')
      .select('id, full_name')
      .eq('professional_id', userId)
      .order('full_name', { ascending: true });
    if (error) console.error('Error al cargar pacientes:', error.message);
    setPatients(data || []);
  };

  const handlePrevPeriod = () => {
    const newDate = new Date(currentDateObj);
    if (calendarView === 'month') newDate.setMonth(newDate.getMonth() - 1);
    else if (calendarView === 'year') newDate.setFullYear(newDate.getFullYear() - 1);
    else if (calendarView === 'week') newDate.setDate(newDate.getDate() - 7);
    else newDate.setDate(newDate.getDate() - 1);
    setCurrentDateObj(newDate);
    setSelectedDate(formatLocalDateStr(newDate));
  };

  const handleNextPeriod = () => {
    const newDate = new Date(currentDateObj);
    if (calendarView === 'month') newDate.setMonth(newDate.getMonth() + 1);
    else if (calendarView === 'year') newDate.setFullYear(newDate.getFullYear() + 1);
    else if (calendarView === 'week') newDate.setDate(newDate.getDate() + 7);
    else newDate.setDate(newDate.getDate() + 1);
    setCurrentDateObj(newDate);
    setSelectedDate(formatLocalDateStr(newDate));
  };

  const generateTimeSlotsForSelectedDate = () => {
    if (!selectedDate) return [];
    const dateObj = new Date(selectedDate + 'T00:00:00');
    const dayOfWeek = dateObj.getDay();

    const matchingAvailabilities = availability.filter(a => {
      if (a.day_of_week !== dayOfWeek) return false;
      if (a.is_permanent_schedule) return true;
      if (a.valid_from && selectedDate < a.valid_from) return false;
      if (a.valid_until && selectedDate > a.valid_until) return false;
      return true;
    });

    let slots = [];

    matchingAvailabilities.forEach(a => {
      const [sh, sm] = a.start_time.split(':').map(Number);
      const [eh, em] = a.end_time.split(':').map(Number);

      let currentMinutes = sh * 60 + sm;
      const endMinutes = eh * 60 + em;
      const slotDuration = a.slot_duration_minutes || 30;
      const intervalMinutes = a.interval_minutes || 0;
      const totalStep = slotDuration + intervalMinutes;

      while (currentMinutes + slotDuration <= endMinutes) {
        const h = Math.floor(currentMinutes / 60).toString().padStart(2, '0');
        const m = (currentMinutes % 60).toString().padStart(2, '0');
        const timeStr = `${h}:${m}`;
        const slotDateTime = `${selectedDate}T${timeStr}:00`;

        const matchedAppt = appointments.find(app => {
          if (app.status === 'cancelled' || app.status === 'cancelado') return false;
          return formatLocalDateTimeStr(new Date(app.start_time)) === `${selectedDate}T${timeStr}`;
        });

        const isInsideAvailability = matchingAvailabilities.some(av => {
          const t = timeStrToMinutes(timeStr);
          return t >= timeStrToMinutes(av.start_time) && t <= timeStrToMinutes(av.end_time);
        });

        let isBlocked = !isInsideAvailability;
        let blockReason = isBlocked ? 'Fuera de horario laboral' : '';

        if (!slots.some(s => s.time === timeStr)) {
          slots.push({
            time: timeStr,
            dateTime: slotDateTime,
            appointment: matchedAppt || null,
            isBlocked,
            blockReason
          });
        }

        currentMinutes += totalStep;
      }
    });

    const dayAppointments = appointments.filter(app => {
      if (app.status === 'cancelled' || app.status === 'cancelado') return false;
      return formatLocalDateStr(new Date(app.start_time)) === selectedDate;
    });

    dayAppointments.forEach(app => {
      const timeStr = formatLocalTimeStr(new Date(app.start_time));
      const existingSlotIndex = slots.findIndex(s => s.time === timeStr);

      if (existingSlotIndex >= 0) {
        if (!slots[existingSlotIndex].appointment) {
          slots[existingSlotIndex] = {
            ...slots[existingSlotIndex],
            appointment: app,
            isBlocked: false,
            blockReason: ''
          };
        }
      } else {
        slots.push({
          time: timeStr,
          dateTime: `${selectedDate}T${timeStr}:00`,
          appointment: app,
          isBlocked: false,
          blockReason: ''
        });
      }
    });

    return slots.sort((a, b) => a.time.localeCompare(b.time));
  };

  const timeSlots = generateTimeSlotsForSelectedDate();

  const getDurationMinutesFor = (localDateTimeStr) => {
    const [dateStr, timeStr] = localDateTimeStr.split('T');
    const dayOfWeek = new Date(dateStr + 'T00:00:00').getDay();

    const matchingAvail = availability.find(a => {
      if (a.day_of_week !== dayOfWeek) return false;
      const t = timeStrToMinutes(timeStr);
      if (!(t >= timeStrToMinutes(a.start_time) && t < timeStrToMinutes(a.end_time))) return false;
      if (a.is_permanent_schedule) return true;
      if (a.valid_from && dateStr < a.valid_from) return false;
      if (a.valid_until && dateStr > a.valid_until) return false;
      return true;
    });

    return matchingAvail?.slot_duration_minutes || 30;
  };

  const handleSaveAppointment = async (e) => {
    e.preventDefault();
    if (!user) return;

    if (modalMode === 'create') {
      const selectedDateTime = new Date(currentAppt.start_time);
      const now = new Date();
      if (selectedDateTime < now) {
        alert('No se pueden agendar citas en fechas u horas pasadas.');
        return;
      }
    }

    if (modalMode === 'create' && patientMode === 'new' && !newPatientData.full_name.trim()) {
      alert('Escribe el nombre del nuevo paciente.');
      return;
    }
    if ((modalMode === 'edit' || patientMode === 'existing') && !currentAppt.patient_id) {
      alert('Selecciona un paciente.');
      return;
    }
    if (!currentAppt.start_time) {
      alert('Selecciona fecha y hora.');
      return;
    }

    setSavingAppt(true);
    try {
      let patientId = currentAppt.patient_id;

      if (modalMode === 'create' && patientMode === 'new') {
        const newPatientPayload = {
          professional_id: activeProfessionalId,
          full_name: newPatientData.full_name.trim(),
        };
        if (newPatientData.phone.trim()) newPatientPayload.phone = newPatientData.phone.trim();
        if (newPatientData.email.trim()) newPatientPayload.email = newPatientData.email.trim();

        const { data: insertedPatient, error: patientError } = await supabase
          .from('patients')
          .insert([newPatientPayload])
          .select()
          .single();

        if (patientError) {
          alert('Error al registrar el nuevo paciente: ' + patientError.message);
          setSavingAppt(false);
          return;
        }

        patientId = insertedPatient.id;
      }

      const durationMinutes = getDurationMinutesFor(currentAppt.start_time);
      const startTime = localInputToUTCISOString(currentAppt.start_time);
      const endTime = addMinutesToISOString(startTime, durationMinutes);

      const payload = {
        professional_id: activeProfessionalId,
        patient_id: patientId,
        start_time: startTime,
        end_time: endTime,
        status: currentAppt.status
      };

      let error;
      if (modalMode === 'create') {
        ({ error } = await supabase.from('appointments').insert([payload]));
      } else {
        ({ error } = await supabase.from('appointments').update(payload).eq('id', currentAppt.id));
      }

      if (error) {
        alert('Error al guardar la cita: ' + error.message);
        return;
      }

      setShowModal(false);
      setPatientMode('existing');
      setNewPatientData({ full_name: '', phone: '', email: '' });
      loadAppointments(activeProfessionalId);
      if (modalMode === 'create' && patientMode === 'new') {
        loadPatients(activeProfessionalId);
      }
    } finally {
      setSavingAppt(false);
    }
  };

  const handleDeleteAppointment = async (id) => {
    if (window.confirm('¿Cancelar esta cita?')) {
      await supabase.from('appointments').delete().eq('id', id);
      loadAppointments(activeProfessionalId);
    }
  };

  const handleAddAvailability = async (e) => {
    e.preventDefault();
    if (!user) return;

    let daysToInsert = [];
    if (availMode === 'single_day') {
      daysToInsert = [Number(newAvail.single_day)];
    } else {
      const start = Number(newAvail.start_day);
      const end = Number(newAvail.end_day);
      if (start <= end) {
        for (let d = start; d <= end; d++) daysToInsert.push(d);
      } else {
        for (let d = start; d <= 6; d++) daysToInsert.push(d);
        for (let d = 0; d <= end; d++) daysToInsert.push(d);
      }
    }

    for (const day of daysToInsert) {
      const hasOverlap = availability.some(av => {
        if (av.day_of_week !== day) return false;
        return (
          timeStrToMinutes(newAvail.start_time) < timeStrToMinutes(av.end_time) &&
          timeStrToMinutes(newAvail.end_time) > timeStrToMinutes(av.start_time)
        );
      });

      if (hasOverlap) {
        alert(`Error: Ya tienes un turno registrado que se cruza o coincide para el día seleccionado.`);
        return;
      }
    }

    const payloads = daysToInsert.map(day => ({
      professional_id: activeProfessionalId,
      day_of_week: day,
      start_time: newAvail.start_time,
      end_time: newAvail.end_time,
      slot_duration_minutes: Number(newAvail.slot_duration_minutes),
      interval_minutes: Number(newAvail.interval_minutes || 0),
      valid_from: newAvail.is_permanent_schedule ? null : newAvail.valid_from,
      valid_until: newAvail.is_permanent_schedule ? null : newAvail.valid_until,
      is_permanent_schedule: newAvail.is_permanent_schedule
    }));

    const { error } = await supabase.from('availability').insert(payloads);
    if (error) {
      alert('Error al guardar los horarios base.');
      console.error(error);
    } else {
      loadAvailability(activeProfessionalId);
      alert('¡Turno laboral añadido con éxito!');
    }
  };

  const handleDeleteAvailability = async (id) => {
    await supabase.from('availability').delete().eq('id', id);
    loadAvailability(activeProfessionalId);
  };

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => {
    let day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const openCreateModal = (prefillTime) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const targetTime = prefillTime || `${selectedDate}T09:00`;
    setCurrentAppt({ id: '', patient_id: '', start_time: targetTime, end_time: '', status: 'confirmed' });
    setPatientMode('existing');
    setNewPatientData({ full_name: '', phone: '', email: '' });
    setModalMode('create');
    setShowModal(true);
  };

  const openEditModal = (appointment) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentAppt({
      id: appointment.id,
      patient_id: appointment.patient_id,
      start_time: formatLocalDateTimeStr(new Date(appointment.start_time)),
      end_time: appointment.end_time,
      status: appointment.status
    });
    setPatientMode('existing');
    setModalMode('edit');
    setShowModal(true);
  };

  return (
    <div className="animate-fade-in-up space-y-5">
      <div className="grid grid-cols-2 rounded-xl bg-slate-200/70 p-1 sm:inline-flex sm:w-auto">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`rounded-lg px-4 py-2.5 text-center text-xs font-bold transition-colors cursor-pointer sm:text-sm ${
            activeTab === 'calendar' ? 'bg-white text-sky-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          📅 Vista de Agenda
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`rounded-lg px-4 py-2.5 text-center text-xs font-bold transition-colors cursor-pointer sm:text-sm ${
            activeTab === 'config' ? 'bg-white text-sky-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          ⚙️ Horarios de Atención
        </button>
      </div>

      {activeTab === 'calendar' && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs sm:p-6">
          <div className="flex flex-col gap-3.5 border-b border-slate-100 pb-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center justify-between gap-2">
              <button onClick={handlePrevPeriod} className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 font-bold text-slate-700 hover:bg-slate-100 cursor-pointer">&larr;</button>
              <h2 className="min-w-0 flex-1 truncate text-center text-sm font-bold capitalize text-slate-800 sm:text-base">
                {calendarView === 'year'
                  ? currentDateObj.getFullYear()
                  : calendarView === 'month'
                  ? currentDateObj.toLocaleString('es-ES', { month: 'long', year: 'numeric' })
                  : `${getDayName(new Date(selectedDate + 'T00:00:00').getDay())} ${selectedDate.split('-').reverse().join('-')}`}
              </h2>
              <button onClick={handleNextPeriod} className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 font-bold text-slate-700 hover:bg-slate-100 cursor-pointer">&rarr;</button>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <div className="grid grid-cols-4 rounded-xl bg-slate-100 p-1">
                <button onClick={() => setCalendarView('day')} className={`rounded-lg py-1.5 text-center text-xs font-bold transition cursor-pointer ${calendarView === 'day' ? 'bg-white text-sky-700 shadow-2xs' : 'text-slate-600'}`}>Día</button>
                <button onClick={() => setCalendarView('week')} className={`rounded-lg py-1.5 text-center text-xs font-bold transition cursor-pointer ${calendarView === 'week' ? 'bg-white text-sky-700 shadow-2xs' : 'text-slate-600'}`}>Semana</button>
                <button onClick={() => setCalendarView('month')} className={`rounded-lg py-1.5 text-center text-xs font-bold transition cursor-pointer ${calendarView === 'month' ? 'bg-white text-sky-700 shadow-2xs' : 'text-slate-600'}`}>Mes</button>
                <button onClick={() => setCalendarView('year')} className={`rounded-lg py-1.5 text-center text-xs font-bold transition cursor-pointer ${calendarView === 'year' ? 'bg-white text-sky-700 shadow-2xs' : 'text-slate-600'}`}>Año</button>
              </div>

              <button
                onClick={() => openCreateModal()}
                className="w-full rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-sky-700 cursor-pointer sm:w-auto sm:text-sm"
              >
                + Añadir Cita
              </button>
            </div>
          </div>

          {calendarView === 'day' && (
            <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="text-xs font-bold text-slate-700">Seleccionar otra fecha:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setCurrentDateObj(new Date(e.target.value + 'T00:00:00'));
                }}
                className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs font-semibold text-slate-800 sm:w-auto"
              />
            </div>
          )}

          {loadingAppts ? (
            <p className="py-8 text-center text-xs text-slate-500">Cargando citas...</p>
          ) : (
            <>
              {calendarView === 'day' && (
                <div>
                  {timeSlots.length === 0 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-xs font-semibold text-amber-800">
                      No hay franjas horarias configuradas para este día (jornada cerrada por defecto).
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
                        {timeSlots.map((slot, index) => (
                          <div key={index} className="flex flex-col gap-2.5 p-3.5 transition hover:bg-slate-50/80 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4">
                            <div className="font-mono text-sm font-bold text-slate-700 sm:w-20 sm:text-base">
                              {slot.time}
                            </div>

                            <div className="min-w-0 flex-1">
                              {slot.isBlocked ? (
                                <span className="inline-block rounded-lg bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 border border-red-100">
                                  🚫 Bloqueado ({slot.blockReason})
                                </span>
                              ) : slot.appointment ? (
                                <div
                                  onClick={() => openAppointmentDetail(slot.appointment)}
                                  className="flex flex-col gap-2 rounded-xl border border-sky-200 bg-sky-50/70 p-3 cursor-pointer transition hover:bg-sky-100/70 sm:flex-row sm:items-center sm:justify-between"
                                >
                                  <div className="min-w-0">
                                    <span className="block truncate font-bold text-sky-900 sm:inline">{slot.appointment.patients?.full_name || 'Paciente desconocido'}</span>
                                    <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold uppercase text-emerald-800 sm:ml-2 sm:mt-0">
                                      {slot.appointment.status}
                                    </span>
                                  </div>
                                  <div className="flex shrink-0 gap-2 pt-1 sm:pt-0">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openEditModal(slot.appointment);
                                      }}
                                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-sky-700 shadow-2xs hover:bg-slate-50"
                                    >
                                      Editar
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteAppointment(slot.appointment.id);
                                      }}
                                      className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-600 shadow-2xs hover:bg-red-50"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <span className="inline-block rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-100">
                                  ✔ Disponible
                                </span>
                              )}
                            </div>

                            {!slot.appointment && !slot.isBlocked && (
                              <button
                                onClick={() => openCreateModal(`${selectedDate}T${slot.time}`)}
                                className="w-full shrink-0 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-sky-600 hover:text-white sm:w-auto"
                              >
                                Agendar aquí
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {calendarView === 'week' && (
                <div>
                  {(() => {
                    const startOfWeek = new Date(currentDateObj);
                    const day = startOfWeek.getDay();
                    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
                    startOfWeek.setDate(diff);

                    const weekDays = Array.from({ length: 7 }).map((_, i) => {
                      const d = new Date(startOfWeek);
                      d.setDate(startOfWeek.getDate() + i);
                      return d;
                    });

                    return (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
                        {weekDays.map((d, index) => {
                          const dateStr = formatLocalDateStr(d);
                          const dayAppts = appointments.filter(app => formatLocalDateStr(new Date(app.start_time)) === dateStr && app.status !== 'cancelled' && app.status !== 'cancelado');
                          const isToday = dateStr === formatLocalDateStr(new Date());
                          return (
                            <div key={index} className={`flex min-h-[160px] flex-col rounded-xl border p-3 shadow-2xs sm:min-h-[220px] ${isToday ? 'border-sky-300 bg-sky-50/40' : 'border-slate-200 bg-white'}`}>
                              <div className="mb-2 border-b border-slate-100 pb-2 text-center">
                                <span className="block text-[11px] font-bold uppercase text-slate-400">{getDayName(d.getDay())}</span>
                                <span className="text-base font-extrabold text-slate-800">{d.getDate()}</span>
                              </div>
                              <div className="flex-1 space-y-1.5 overflow-y-auto">
                                {dayAppts.map(app => (
                                  <div
                                    key={app.id}
                                    onClick={() => openAppointmentDetail(app)}
                                    className="cursor-pointer rounded-lg border border-sky-200 bg-sky-50/70 p-2 text-xs transition hover:bg-sky-100"
                                  >
                                    <span className="block font-bold text-sky-900">{formatLocalTimeStr(new Date(app.start_time))}</span>
                                    <span className="truncate font-semibold text-slate-700">{app.patients?.full_name || 'Paciente'}</span>
                                  </div>
                                ))}
                                {dayAppts.length === 0 && <p className="mt-6 text-center text-xs text-slate-400">Sin citas</p>}
                              </div>
                              <button
                                onClick={() => {
                                  setSelectedDate(dateStr);
                                  setCalendarView('day');
                                }}
                                className="mt-2 block rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-center text-xs font-bold text-sky-700 transition hover:bg-sky-100"
                              >
                                Ver día →
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {calendarView === 'month' && (
                <div>
                  <div className="mb-2 grid grid-cols-7 gap-1 text-center font-bold text-slate-600">
                    {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => <div key={d} className="text-xs uppercase text-slate-400">{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                    {Array.from({ length: getFirstDayOfMonth(currentDateObj.getFullYear(), currentDateObj.getMonth()) }).map((_, i) => (
                      <div key={`empty-${i}`} className="h-16 rounded-xl border border-transparent bg-slate-50/40 sm:h-28"></div>
                    ))}
                    {Array.from({ length: getDaysInMonth(currentDateObj.getFullYear(), currentDateObj.getMonth()) }).map((_, i) => {
                      const dayNum = i + 1;
                      const formattedDate = `${currentDateObj.getFullYear()}-${String(currentDateObj.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                      const dayAppts = appointments.filter(app => formatLocalDateStr(new Date(app.start_time)) === formattedDate && app.status !== 'cancelled' && app.status !== 'cancelado');

                      return (
                        <div
                          key={dayNum}
                          onClick={() => {
                            setSelectedDate(formattedDate);
                            setCalendarView('day');
                          }}
                          className={`h-16 cursor-pointer overflow-y-auto rounded-xl border p-1.5 transition hover:border-sky-400 sm:h-28 sm:p-2.5 ${selectedDate === formattedDate ? 'border-sky-500 bg-sky-50 shadow-2xs' : 'border-slate-200 bg-white'}`}
                        >
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700 sm:text-sm">{dayNum}</span>
                            {dayAppts.length > 0 && (
                              <span className="rounded-full bg-sky-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                {dayAppts.length}
                              </span>
                            )}
                          </div>
                          <div className="hidden space-y-1 sm:block">
                            {dayAppts.slice(0, 2).map(app => (
                              <div
                                key={app.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openAppointmentDetail(app);
                                }}
                                className="truncate rounded-lg bg-sky-100/70 p-1 text-[11px] font-semibold text-sky-900 cursor-pointer transition hover:bg-sky-200"
                              >
                                {formatLocalTimeStr(new Date(app.start_time))} - {app.patients?.full_name || 'Paciente'}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {calendarView === 'year' && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {Array.from({ length: 12 }).map((_, monthIndex) => {
                    const year = currentDateObj.getFullYear();
                    const monthName = new Date(year, monthIndex, 1).toLocaleString('es-ES', { month: 'long' });

                    const monthAppts = appointments.filter(app => {
                      const appDate = new Date(app.start_time);
                      return appDate.getFullYear() === year && appDate.getMonth() === monthIndex && app.status !== 'cancelled' && app.status !== 'cancelado';
                    });

                    return (
                      <div
                        key={monthIndex}
                        onClick={() => {
                          const d = new Date(year, monthIndex, 1);
                          setCurrentDateObj(d);
                          setCalendarView('month');
                        }}
                        className="flex cursor-pointer flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 transition hover:border-sky-500 hover:shadow-sm"
                      >
                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <h3 className="font-bold capitalize text-slate-800">{monthName}</h3>
                            <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{year}</span>
                          </div>
                          <p className="mb-3 text-xs text-slate-500">
                            {monthAppts.length === 0 ? 'Sin citas' : `${monthAppts.length} cita(s)`}
                          </p>
                        </div>
                        <span className="text-right text-xs font-bold text-sky-700">Ver mes →</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'config' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4 text-xs font-semibold text-sky-900">
            <strong>Nota importante:</strong> Todo horario fuera del establecido por el profesional estará bloqueado por defecto y el paciente no podrá agendar en las horas bloqueadas.
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs sm:p-6">
            <h2 className="mb-1 text-base font-bold text-slate-800 sm:text-lg">Horarios Base Laborales</h2>
            <p className="mb-4 text-xs text-slate-500">Define los bloques en los que atiendes. Cualquier espacio ajeno a estos turnos se cerrará automáticamente.</p>

            <div className="mb-4 flex flex-col gap-3.5 rounded-xl border border-slate-100 bg-slate-50 p-3.5 sm:flex-row sm:flex-wrap sm:gap-6">
              <div>
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Aplicación de Días:</span>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
                    <input type="radio" name="availMode" checked={availMode === 'range_days'} onChange={() => setAvailMode('range_days')} className="accent-sky-600" />
                    Rango de días (Ej. Lunes a Viernes)
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
                    <input type="radio" name="availMode" checked={availMode === 'single_day'} onChange={() => setAvailMode('single_day')} className="accent-sky-600" />
                    Día único específico
                  </label>
                </div>
              </div>

              <div>
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Vigencia temporal:</span>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
                    <input type="radio" name="scheduleType" checked={newAvail.is_permanent_schedule} onChange={() => setNewAvail({ ...newAvail, is_permanent_schedule: true })} className="accent-sky-600" />
                    Permanente (Indefinido)
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
                    <input type="radio" name="scheduleType" checked={!newAvail.is_permanent_schedule} onChange={() => setNewAvail({ ...newAvail, is_permanent_schedule: false })} className="accent-sky-600" />
                    Por Rango de Fechas
                  </label>
                </div>
              </div>
            </div>

            <form onSubmit={handleAddAvailability} className="mb-6 grid grid-cols-1 items-end gap-3.5 sm:grid-cols-2 lg:grid-cols-7">
              {availMode === 'range_days' ? (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">Desde el día</label>
                    <select value={newAvail.start_day} onChange={(e) => setNewAvail({ ...newAvail, start_day: Number(e.target.value) })} className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-semibold">
                      {[1, 2, 3, 4, 5, 6, 0].map(d => (<option key={d} value={d}>{getDayName(d)}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">Hasta el día</label>
                    <select value={newAvail.end_day} onChange={(e) => setNewAvail({ ...newAvail, end_day: Number(e.target.value) })} className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-semibold">
                      {[1, 2, 3, 4, 5, 6, 0].map(d => (<option key={d} value={d}>{getDayName(d)}</option>))}
                    </select>
                  </div>
                </>
              ) : (
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Día de la semana</label>
                  <select value={newAvail.single_day} onChange={(e) => setNewAvail({ ...newAvail, single_day: Number(e.target.value) })} className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-semibold">
                    {[1, 2, 3, 4, 5, 6, 0].map(d => (<option key={d} value={d}>{getDayName(d)}</option>))}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Hora Inicio</label>
                <input type="time" value={newAvail.start_time} onChange={(e) => setNewAvail({ ...newAvail, start_time: e.target.value })} className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-semibold" required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Hora Fin</label>
                <input type="time" value={newAvail.end_time} onChange={(e) => setNewAvail({ ...newAvail, end_time: e.target.value })} className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-semibold" required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Bloque (min)</label>
                <input type="number" value={newAvail.slot_duration_minutes} onChange={(e) => setNewAvail({ ...newAvail, slot_duration_minutes: Number(e.target.value) })} className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-semibold" step="5" min="5" required />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Intervalo (min)</label>
                <input type="number" value={newAvail.interval_minutes} onChange={(e) => setNewAvail({ ...newAvail, interval_minutes: Number(e.target.value) })} className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-semibold" step="5" min="0" />
              </div>

              {!newAvail.is_permanent_schedule && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">Fecha inicio vigencia</label>
                    <input type="date" value={newAvail.valid_from} onChange={(e) => setNewAvail({ ...newAvail, valid_from: e.target.value })} className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-semibold" required />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">Fecha fin vigencia</label>
                    <input type="date" value={newAvail.valid_until} onChange={(e) => setNewAvail({ ...newAvail, valid_until: e.target.value })} className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-semibold" required />
                  </div>
                </>
              )}

              <button type="submit" className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white transition hover:bg-emerald-700 cursor-pointer sm:col-span-2 lg:col-span-7">Añadir Turno Laboral</button>
            </form>

            <div className="space-y-2">
              {availability.map((av) => (
                <div key={av.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs font-medium text-slate-700">
                    <strong className="text-slate-900">{getDayName(av.day_of_week)}:</strong> {av.start_time} - {av.end_time} (Bloque: {av.slot_duration_minutes} min{av.interval_minutes ? `, Intervalo: ${av.interval_minutes} min` : ''}) {av.is_permanent_schedule ? '(Permanente)' : `(Del ${av.valid_from} al ${av.valid_until})`}
                  </span>
                  <button onClick={() => handleDeleteAvailability(av.id)} className="self-start text-xs font-bold text-red-500 hover:text-red-700 cursor-pointer sm:self-auto">Eliminar</button>
                </div>
              ))}
              {availability.length === 0 && <p className="text-xs text-slate-400">No hay horarios base configurados. Todo aparecerá bloqueado.</p>}
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 sm:pt-16 bg-black/50 backdrop-blur-xs">
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <h3 className="mb-4 text-base font-bold text-slate-800">{modalMode === 'create' ? 'Añadir Nueva Cita' : 'Editar Cita'}</h3>
            <form onSubmit={handleSaveAppointment} className="space-y-3.5">

              {modalMode === 'create' && (
                <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setPatientMode('existing')}
                    className={`flex-1 rounded-lg py-2 transition cursor-pointer ${patientMode === 'existing' ? 'bg-white text-sky-700 shadow-2xs' : 'text-slate-600'}`}
                  >
                    Paciente existente
                  </button>
                  <button
                    type="button"
                    onClick={() => setPatientMode('new')}
                    className={`flex-1 rounded-lg py-2 transition cursor-pointer ${patientMode === 'new' ? 'bg-white text-sky-700 shadow-2xs' : 'text-slate-600'}`}
                  >
                    Paciente nuevo
                  </button>
                </div>
              )}

              {patientMode === 'existing' || modalMode === 'edit' ? (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Paciente</label>
                  <select value={currentAppt.patient_id} onChange={(e) => setCurrentAppt({ ...currentAppt, patient_id: e.target.value })} className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-semibold" required>
                    <option value="">-- Elige un paciente --</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>{p.full_name}</option>
                    ))}
                  </select>
                  {patients.length === 0 && (
                    <p className="mt-1 text-xs font-medium text-amber-600">No tienes pacientes registrados aún. Usa "Paciente nuevo".</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">Nombre completo *</label>
                    <input
                      type="text"
                      value={newPatientData.full_name}
                      onChange={(e) => setNewPatientData({ ...newPatientData, full_name: e.target.value })}
                      placeholder="Ej. Juan Pérez"
                      className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">Teléfono (opcional)</label>
                    <input
                      type="text"
                      value={newPatientData.phone}
                      onChange={(e) => setNewPatientData({ ...newPatientData, phone: e.target.value })}
                      placeholder="+56912345678"
                      className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">Correo (opcional)</label>
                    <input
                      type="email"
                      value={newPatientData.email}
                      onChange={(e) => setNewPatientData({ ...newPatientData, email: e.target.value })}
                      placeholder="correo@ejemplo.com"
                      className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-semibold"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Fecha y Hora</label>
                <input
                  type="datetime-local"
                  min={modalMode === 'create' ? getCurrentLocalDateTimeMin() : undefined}
                  value={currentAppt.start_time || ''}
                  onChange={(e) => setCurrentAppt({ ...currentAppt, start_time: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-semibold"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Estado</label>
                <select value={currentAppt.status} onChange={(e) => setCurrentAppt({ ...currentAppt, status: e.target.value })} className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-semibold">
                  <option value="confirmed">Confirmada</option>
                  <option value="pending">Pendiente</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              </div>
              <div className="flex flex-col-reverse gap-2 pt-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-xl bg-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 cursor-pointer">Cancelar</button>
                <button type="submit" disabled={savingAppt} className="rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60 cursor-pointer">
                  {savingAppt ? 'Guardando...' : 'Guardar Cita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
  );
}