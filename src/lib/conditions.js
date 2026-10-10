// src/lib/conditions.js
//
// Catálogo de patologías podológicas para la Ficha Clínica marcable.
// Se usa en Historial.jsx (checklist por paciente, guardado en
// patients.conditions como array de "key"). Si necesitas agregar o
// renombrar una patología, hazlo aquí y se reflejará en toda la app.

export const CONDITION_GROUPS = [
  {
    group: 'Uñas',
    items: [
      { key: 'onicocriptosis', label: 'Onicocriptosis (uña encarnada)' },
      { key: 'onicomicosis', label: 'Onicomicosis (hongos en la uña)' },
      { key: 'onicogrifosis', label: 'Onicogrifosis (uña engrosada/deforme)' },
    ],
  },
  {
    group: 'Piel',
    items: [
      { key: 'hiperqueratosis', label: 'Hiperqueratosis plantar' },
      { key: 'helomas', label: 'Helomas (callos / "clavos")' },
      { key: 'verrugas_plantares', label: 'Verrugas plantares (papiloma)' },
      { key: 'tinea_pedis', label: 'Tiña pedis (pie de atleta)' },
      { key: 'talones_agrietados', label: 'Talones agrietados / fisurados' },
    ],
  },
  {
    group: 'Biomecánica / Estructural',
    items: [
      { key: 'fascitis_plantar', label: 'Fascitis plantar' },
      { key: 'hallux_valgus', label: 'Hallux valgus (juanete)' },
      { key: 'dedos_garra', label: 'Dedos en garra / martillo' },
      { key: 'pie_plano', label: 'Pie plano' },
      { key: 'pie_cavo', label: 'Pie cavo' },
    ],
  },
  {
    group: 'Riesgo Vascular y Neuropático',
    items: [
      { key: 'pie_diabetico_bajo', label: 'Pie diabético — riesgo bajo' },
      { key: 'pie_diabetico_medio', label: 'Pie diabético — riesgo medio/alto' },
    ],
  },
];

// Acceso plano por si se necesita buscar la etiqueta de una key puntual
export const ALL_CONDITIONS = CONDITION_GROUPS.flatMap((g) => g.items);

export function getConditionLabel(key) {
  return ALL_CONDITIONS.find((c) => c.key === key)?.label || key;
}
