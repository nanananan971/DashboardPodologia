// src/lib/datetime.js
//
// Helpers de fecha/hora centralizados. Todo el proyecto asume que el
// navegador del profesional corre en la zona horaria de Chile
// (America/Santiago), por lo que usamos los constructores nativos de
// Date (que siempre trabajan en la hora local del dispositivo) en vez
// de armar el offset a mano. Así el cálculo queda correcto todo el año,
// incluso cuando cambia el horario de verano.

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Nombre del día en español a partir del índice de JS (0 = Domingo ... 6 = Sábado)
export function getDayName(dayIndex) {
  return DIAS[dayIndex] ?? '';
}

// "YYYY-MM-DD" en hora LOCAL (no usar toISOString().split('T')[0], que trabaja en UTC)
export function formatLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// "HH:MM" en hora LOCAL
export function formatLocalTimeStr(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${min}`;
}

// "YYYY-MM-DDTHH:MM" en hora LOCAL, formato que espera <input type="datetime-local">
export function formatLocalDateTimeStr(date) {
  return `${formatLocalDateStr(date)}T${formatLocalTimeStr(date)}`;
}

// Convierte el valor de un <input type="datetime-local"> (ej. "2026-08-21T10:10"),
// interpretado como hora LOCAL de Chile, a un ISO string en UTC correcto para
// guardar en una columna timestamptz de Postgres.
export function localInputToUTCISOString(localDateTimeStr) {
  const [datePart, timePart] = localDateTimeStr.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  // El constructor de Date con componentes sueltos SIEMPRE interpreta los
  // valores como hora local del navegador, así que esto queda correcto
  // sin importar si hay horario de verano vigente o no.
  const localDate = new Date(year, month - 1, day, hour, minute, 0, 0);
  return localDate.toISOString();
}

// Suma minutos a un ISO string y devuelve otro ISO string (UTC)
export function addMinutesToISOString(isoString, minutes) {
  const date = new Date(isoString);
  date.setMinutes(date.getMinutes() + Number(minutes || 0));
  return date.toISOString();
}

// Convierte "HH:MM" o "HH:MM:SS" a minutos totales desde medianoche.
// Postgres devuelve las columnas `time` (start_time/end_time de
// `availability`) CON segundos, ej. "09:00:00", mientras que los
// <input type="time"> del formulario y los horarios que arma la Agenda
// para cada bloque son "HH:MM", sin segundos. Comparar esos dos formatos
// directamente como texto es un bug clásico: "09:00" < "09:00:00" es
// true (el string más corto se considera "menor"), así que la franja
// exactamente a la hora de inicio quedaba marcada como fuera de horario.
// Por eso toda comparación de horarios debe pasar por este helper y
// comparar minutos (números), nunca los strings directamente.
export function timeStrToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

// Fecha legible completa en español, ej: "viernes, 21 de agosto de 2026"
export function formatFechaLegible(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const texto = date.toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Hora legible corta, ej: "17:00"
export function formatHoraLegible(isoString) {
  if (!isoString) return '';
  return formatLocalTimeStr(new Date(isoString));
}
