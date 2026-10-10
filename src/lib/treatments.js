// src/lib/treatments.js
//
// Catálogo de tratamientos y medicamentos tópicos de aplicación habitual
// en podología. Se usa en Historial.jsx para marcar recomendaciones de
// tratamiento por paciente (guardado en patients.treatment_recommendations
// como array de "key") y para registrar qué se aplicó en cada sesión
// (clinical_notes.treatments_applied).

export const TREATMENT_GROUPS = [
  {
    group: 'Antifúngicos tópicos',
    items: [
      { key: 'crema_antifungica', label: 'Crema antifúngica (clotrimazol / terbinafina)' },
      { key: 'laca_antifungica', label: 'Laca ungueal antifúngica' },
      { key: 'polvo_antifungico', label: 'Polvo antifúngico para calzado/pie' },
    ],
  },
  {
    group: 'Queratolíticos / Hidratación',
    items: [
      { key: 'urea_10_20', label: 'Crema con urea 10–20%' },
      { key: 'urea_30_40', label: 'Crema con urea 30–40% (hiperqueratosis severa)' },
      { key: 'vaselina_salicilica', label: 'Vaselina salicílica' },
    ],
  },
  {
    group: 'Curaciones y Antisépticos',
    items: [
      { key: 'curacion_plana', label: 'Curación plana con antiséptico' },
      { key: 'aposito_ulcera', label: 'Apósito para úlcera / herida' },
      { key: 'povidona_clorhexidina', label: 'Povidona yodada / clorhexidina' },
    ],
  },
  {
    group: 'Descarga y Educación',
    items: [
      { key: 'fieltro_descarga', label: 'Fieltro / descarga ortopédica' },
      { key: 'orsesis_silicona', label: 'Órtesis de silicona' },
      { key: 'vendaje_compresivo', label: 'Vendaje compresivo' },
      { key: 'educacion_autocuidado', label: 'Educación en autocuidado del pie diabético' },
    ],
  },
];

export const ALL_TREATMENTS = TREATMENT_GROUPS.flatMap((g) => g.items);

export function getTreatmentLabel(key) {
  return ALL_TREATMENTS.find((t) => t.key === key)?.label || key;
}

// --- Control de Evolución (opciones seleccionables) ---

export const PROGRESS_LEVELS = [
  { value: 'inicial', label: 'Evaluación inicial' },
  { value: 'en_tratamiento', label: 'En tratamiento' },
  { value: 'buena_evolucion', label: 'Buena evolución' },
  { value: 'estancado', label: 'Sin cambios / estancado' },
  { value: 'alta', label: 'Alta clínica' },
];

export const IMPROVEMENT_STATUS = [
  { value: 'sin_evaluar', label: 'Sin evaluar aún' },
  { value: 'empeora', label: 'Empeora' },
  { value: 'igual', label: 'Se mantiene igual' },
  { value: 'mejora_leve', label: 'Mejora leve' },
  { value: 'mejora_notoria', label: 'Mejora notoria' },
  { value: 'resuelto', label: 'Resuelto / dado de alta' },
];

export const ESTIMATED_DURATIONS = [
  { value: 1, label: '1 semana' },
  { value: 2, label: '2 semanas' },
  { value: 4, label: '1 mes (4 semanas)' },
  { value: 8, label: '2 meses (8 semanas)' },
  { value: 12, label: '3 meses (12 semanas)' },
  { value: 24, label: '6 meses (24 semanas)' },
  { value: 0, label: 'Indefinido / seguimiento continuo' },
];
