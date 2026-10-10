// src/components/Historial.jsx
//
// Historial Clínico Podológico = Ficha Clínica (patologías marcables +
// tratamientos recomendados + control de evolución, fija por paciente)
// + Registro cronológico (una entrada por sesión, tabla clinical_notes).
//
// La ficha clínica se guarda en:
//   patients.conditions               -> patologías marcadas (checklist)
//   patients.conditions_notes         -> "otras patologías" / detalle libre
//   patients.treatment_recommendations-> tratamientos/medicamentos marcados
//   patients.treatment_notes          -> indicaciones de tratamiento libres
//   patients.progress_level           -> etapa general del caso
//   patients.improvement_status       -> cómo va evolucionando
//   patients.estimated_duration_weeks -> duración estimada del tratamiento
//
// El catálogo de patologías vive en src/lib/conditions.js y el de
// tratamientos + opciones de evolución en src/lib/treatments.js.
//
// Si el profesional que ve esta pantalla es el dueño de una cuenta con
// equipo, puede ver/editar la ficha de pacientes de sus profesionales
// (permitido por las políticas RLS "owner_equipo_*" del SQL de
// actualización), por eso todas las consultas usan `professionalId`,
// que llega desde App.jsx y puede ser el propio usuario u otro
// profesional de su misma cuenta.

import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { CONDITION_GROUPS } from '../lib/conditions'
import { TREATMENT_GROUPS, PROGRESS_LEVELS, IMPROVEMENT_STATUS, ESTIMATED_DURATIONS } from '../lib/treatments'
import { imprimirFichaPaciente } from '../lib/pdfFicha'

export default function Historial({ session, professionalId, initialPatientId, onPatientChange, profile }) {
  const activeProfessionalId = professionalId || session?.user?.id

  const [patients, setPatients] = useState([])
  const [loadingPatients, setLoadingPatients] = useState(true)
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId || '')
  const [busqueda, setBusqueda] = useState('')

  const [notes, setNotes] = useState([])
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [nuevaNota, setNuevaNota] = useState('')
  const [nuevaNotaTratamientos, setNuevaNotaTratamientos] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  // --- Ficha clínica: patologías, tratamientos y evolución ---
  const [conditions, setConditions] = useState([])
  const [conditionsNotes, setConditionsNotes] = useState('')
  const [treatments, setTreatments] = useState([])
  const [treatmentNotes, setTreatmentNotes] = useState('')
  const [progressLevel, setProgressLevel] = useState('inicial')
  const [improvementStatus, setImprovementStatus] = useState('sin_evaluar')
  const [estimatedDuration, setEstimatedDuration] = useState(4)
  const [savingFicha, setSavingFicha] = useState(false)
  const [fichaDirty, setFichaDirty] = useState(false)
  const [fichaMensaje, setFichaMensaje] = useState('')

  useEffect(() => {
    if (activeProfessionalId) fetchPatients()
  }, [activeProfessionalId])

  useEffect(() => {
    setSelectedPatientId(initialPatientId || '')
  }, [initialPatientId])

  useEffect(() => {
    if (selectedPatientId) {
      fetchNotes(selectedPatientId)
    } else {
      setNotes([])
    }
  }, [selectedPatientId])

  const fetchPatients = async () => {
    setLoadingPatients(true)
    const { data, error } = await supabase
      .from('patients')
      .select(
        'id, full_name, rut, phone, email, medical_history, allergies, conditions, conditions_notes, treatment_recommendations, treatment_notes, progress_level, improvement_status, estimated_duration_weeks'
      )
      .eq('professional_id', activeProfessionalId)
      .order('full_name', { ascending: true })

    if (error) console.error('Error al cargar pacientes:', error.message)
    setPatients(data || [])
    setLoadingPatients(false)
  }

  const fetchNotes = async (patientId) => {
    setLoadingNotes(true)
    const { data, error } = await supabase
      .from('clinical_notes')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error al cargar historial:', error.message)
    } else {
      setNotes(data || [])
    }
    setLoadingNotes(false)
  }

  const handleSelectPatient = (id) => {
    setSelectedPatientId(id)
    onPatientChange?.(id)
    setMensaje('')
    setFichaMensaje('')
    setNuevaNotaTratamientos([])

    const paciente = patients.find((p) => p.id === id)
    setConditions(Array.isArray(paciente?.conditions) ? paciente.conditions : [])
    setConditionsNotes(paciente?.conditions_notes || '')
    setTreatments(Array.isArray(paciente?.treatment_recommendations) ? paciente.treatment_recommendations : [])
    setTreatmentNotes(paciente?.treatment_notes || '')
    setProgressLevel(paciente?.progress_level || 'inicial')
    setImprovementStatus(paciente?.improvement_status || 'sin_evaluar')
    setEstimatedDuration(
      paciente?.estimated_duration_weeks === null || paciente?.estimated_duration_weeks === undefined
        ? 4
        : paciente.estimated_duration_weeks
    )
    setFichaDirty(false)
  }

  const toggleCondition = (key) => {
    setConditions((prev) => (prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]))
    setFichaDirty(true)
  }

  const toggleTreatment = (key) => {
    setTreatments((prev) => (prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]))
    setFichaDirty(true)
  }

  const toggleNuevaNotaTratamiento = (key) => {
    setNuevaNotaTratamientos((prev) => (prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]))
  }

  const handleGuardarFicha = async () => {
    if (!selectedPatientId) return
    setSavingFicha(true)
    setFichaMensaje('')

    const { error } = await supabase
      .from('patients')
      .update({
        conditions,
        conditions_notes: conditionsNotes.trim() || null,
        treatment_recommendations: treatments,
        treatment_notes: treatmentNotes.trim() || null,
        progress_level: progressLevel,
        improvement_status: improvementStatus,
        estimated_duration_weeks: estimatedDuration,
      })
      .eq('id', selectedPatientId)

    if (error) {
      setFichaMensaje('Error al guardar la ficha: ' + error.message)
    } else {
      setFichaMensaje('Ficha clínica actualizada.')
      setFichaDirty(false)
      setPatients((prev) =>
        prev.map((p) =>
          p.id === selectedPatientId
            ? {
                ...p,
                conditions,
                conditions_notes: conditionsNotes,
                treatment_recommendations: treatments,
                treatment_notes: treatmentNotes,
                progress_level: progressLevel,
                improvement_status: improvementStatus,
                estimated_duration_weeks: estimatedDuration,
              }
            : p
        )
      )
      setTimeout(() => setFichaMensaje(''), 2200)
    }
    setSavingFicha(false)
  }

  const handleAddNote = async (e) => {
    e.preventDefault()
    if (!nuevaNota.trim() || !selectedPatientId) return

    setGuardando(true)
    setMensaje('')

    const { error } = await supabase.from('clinical_notes').insert([{
      patient_id: selectedPatientId,
      professional_id: activeProfessionalId,
      notes: nuevaNota.trim(),
      treatments_applied: nuevaNotaTratamientos,
      progress_level: progressLevel,
      improvement_status: improvementStatus,
    }])

    if (error) {
      setMensaje('Error al guardar la nota: ' + error.message)
    } else {
      setNuevaNota('')
      setNuevaNotaTratamientos([])
      fetchNotes(selectedPatientId)
    }
    setGuardando(false)
  }

  const handleDeleteNote = async (id) => {
    if (!window.confirm('¿Eliminar esta entrada del historial?')) return
    const { error } = await supabase.from('clinical_notes').delete().eq('id', id)
    if (error) {
      alert('Error al eliminar: ' + error.message)
    } else {
      fetchNotes(selectedPatientId)
    }
  }

  const pacientesFiltrados = patients.filter((p) => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return true
    return p.full_name?.toLowerCase().includes(q) || p.rut?.toLowerCase().includes(q)
  })

  const pacienteActivo = patients.find((p) => p.id === selectedPatientId)
  const totalSesiones = notes.length

  const formatFecha = (iso) => {
    if (!iso) return ''
    return new Date(iso).toLocaleString('es-CL', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  const treatmentLabel = (key) =>
    TREATMENT_GROUPS.flatMap((g) => g.items).find((t) => t.key === key)?.label || key

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h3 className="text-lg font-semibold text-slate-800">Historial Clínico Podológico</h3>
        <p className="text-sm text-slate-500">Ficha clínica, tratamientos, evolución y registro cronológico por paciente.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Selector de pacientes */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs lg:col-span-1">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar paciente..."
            className="mb-3 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none transition-colors focus:border-sky-600 focus:bg-white"
          />

          {loadingPatients ? (
            <div className="space-y-2 py-2">
              <div className="skeleton h-9 w-full" />
              <div className="skeleton h-9 w-full" />
              <div className="skeleton h-9 w-full" />
            </div>
          ) : pacientesFiltrados.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No hay pacientes que coincidan.</p>
          ) : (
            <div className="max-h-[420px] space-y-1 overflow-y-auto">
              {pacientesFiltrados.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPatient(p.id)}
                  className={`w-full rounded-md px-3 py-2.5 text-left text-sm transition-colors cursor-pointer ${
                    selectedPatientId === p.id ? 'bg-sky-50 font-medium text-sky-700' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {p.full_name}
                  {Array.isArray(p.conditions) && p.conditions.length > 0 && (
                    <span className="ml-2 inline-block rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                      {p.conditions.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Historial del paciente seleccionado */}
        <div className="lg:col-span-2">
          {!pacienteActivo ? (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
              <p className="text-sm text-slate-500">Selecciona un paciente a la izquierda para ver o editar su ficha clínica.</p>
            </div>
          ) : (
            <div key={selectedPatientId} className="animate-fade-in space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-base font-semibold text-slate-900">{pacienteActivo.full_name}</h4>
                    <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
                      {pacienteActivo.rut && <span>RUN: {pacienteActivo.rut}</span>}
                      {pacienteActivo.phone && <span>Tel: {pacienteActivo.phone}</span>}
                      {pacienteActivo.email && <span>{pacienteActivo.email}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                      {totalSesiones} sesión{totalSesiones !== 1 ? 'es' : ''} registrada{totalSesiones !== 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={() => imprimirFichaPaciente(pacienteActivo, notes, profile)}
                      className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 cursor-pointer"
                    >
                      🖨️ Descargar Ficha (PDF)
                    </button>
                  </div>
                </div>
                {pacienteActivo.allergies && (
                  <p className="mt-2 rounded-md bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
                    ⚠ Alergias: {pacienteActivo.allergies}
                  </p>
                )}
                {pacienteActivo.medical_history && (
                  <p className="mt-2 text-xs text-slate-500">
                    <strong className="text-slate-600">Antecedentes:</strong> {pacienteActivo.medical_history}
                  </p>
                )}
              </div>

              {/* Ficha clínica: patologías marcables */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h5 className="text-sm font-semibold text-slate-700">Ficha clínica — patologías podológicas</h5>
                  {fichaDirty && (
                    <button
                      onClick={handleGuardarFicha}
                      disabled={savingFicha}
                      className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-sky-700 disabled:opacity-60 cursor-pointer"
                    >
                      {savingFicha ? 'Guardando...' : 'Guardar ficha'}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {CONDITION_GROUPS.map((group) => (
                    <div key={group.group}>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">{group.group}</p>
                      <div className="space-y-1.5">
                        {group.items.map((item) => (
                          <label key={item.key} className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={conditions.includes(item.key)}
                              onChange={() => toggleCondition(item.key)}
                              className="h-4 w-4 shrink-0 accent-sky-600"
                            />
                            {item.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">Otras patologías / detalle</label>
                  <textarea
                    value={conditionsNotes}
                    onChange={(e) => { setConditionsNotes(e.target.value); setFichaDirty(true) }}
                    rows="2"
                    placeholder="Ej. Antecedente de cirugía en dedo gordo pie derecho (2022)..."
                    className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none transition-colors focus:border-sky-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* Tratamientos / medicamentos recomendados */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <h5 className="mb-3 text-sm font-semibold text-slate-700">Recomendaciones de tratamiento / medicamentos tópicos</h5>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {TREATMENT_GROUPS.map((group) => (
                    <div key={group.group}>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">{group.group}</p>
                      <div className="space-y-1.5">
                        {group.items.map((item) => (
                          <label key={item.key} className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={treatments.includes(item.key)}
                              onChange={() => toggleTreatment(item.key)}
                              className="h-4 w-4 shrink-0 accent-emerald-600"
                            />
                            {item.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">Indicaciones de tratamiento (posología, frecuencia, etc.)</label>
                  <textarea
                    value={treatmentNotes}
                    onChange={(e) => { setTreatmentNotes(e.target.value); setFichaDirty(true) }}
                    rows="2"
                    placeholder="Ej. Aplicar crema con urea 30% en talones cada noche por 3 semanas..."
                    className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none transition-colors focus:border-sky-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* Control de evolución */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <h5 className="mb-3 text-sm font-semibold text-slate-700">Control de evolución</h5>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-700">Etapa del caso</label>
                    <select
                      value={progressLevel}
                      onChange={(e) => { setProgressLevel(e.target.value); setFichaDirty(true) }}
                      className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-sky-600 focus:bg-white"
                    >
                      {PROGRESS_LEVELS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-700">Estado de mejora clínica</label>
                    <select
                      value={improvementStatus}
                      onChange={(e) => { setImprovementStatus(e.target.value); setFichaDirty(true) }}
                      className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-sky-600 focus:bg-white"
                    >
                      {IMPROVEMENT_STATUS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-700">Duración estimada del tratamiento</label>
                    <select
                      value={estimatedDuration}
                      onChange={(e) => { setEstimatedDuration(Number(e.target.value)); setFichaDirty(true) }}
                      className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-sky-600 focus:bg-white"
                    >
                      {ESTIMATED_DURATIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                    </select>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Sesiones realizadas hasta hoy: <strong className="text-slate-700">{totalSesiones}</strong>
                </p>
                {fichaMensaje && <p className="mt-3 animate-fade-in text-xs font-medium text-emerald-600">{fichaMensaje}</p>}
              </div>

              {/* Nueva entrada del registro cronológico */}
              <form onSubmit={handleAddNote} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <label className="mb-1.5 block text-xs font-medium text-slate-700">Nueva entrada de la sesión</label>
                <textarea
                  value={nuevaNota}
                  onChange={(e) => setNuevaNota(e.target.value)}
                  rows="3"
                  placeholder="Ej: Consulta de control, se observa mejoría en..."
                  className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none transition-colors focus:border-sky-600 focus:bg-white"
                />

                <div className="mt-3">
                  <p className="mb-1.5 text-xs font-medium text-slate-700">Tratamientos aplicados en esta sesión (opcional)</p>
                  <div className="flex flex-wrap gap-2">
                    {TREATMENT_GROUPS.flatMap((g) => g.items).map((item) => (
                      <label
                        key={item.key}
                        className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          nuevaNotaTratamientos.includes(item.key)
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={nuevaNotaTratamientos.includes(item.key)}
                          onChange={() => toggleNuevaNotaTratamiento(item.key)}
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  {mensaje && <p className="text-xs text-red-600">{mensaje}</p>}
                  <button
                    type="submit"
                    disabled={guardando || !nuevaNota.trim()}
                    className="ml-auto rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700 disabled:opacity-50 cursor-pointer"
                  >
                    {guardando ? 'Guardando...' : 'Guardar entrada'}
                  </button>
                </div>
              </form>

              {/* Línea de tiempo */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <h5 className="mb-3 text-sm font-semibold text-slate-700">Registro cronológico</h5>
                {loadingNotes ? (
                  <div className="space-y-2">
                    <div className="skeleton h-14 w-full" />
                    <div className="skeleton h-14 w-full" />
                  </div>
                ) : notes.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
                    <p className="text-sm text-slate-500">Todavía no hay entradas registradas para este paciente.</p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {notes.map((n) => (
                      <li key={n.id} className="animate-fade-in rounded-lg border border-slate-100 bg-slate-50 p-3.5">
                        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-medium text-slate-500">
                            {n.session_number ? `Sesión #${n.session_number} · ` : ''}{formatFecha(n.created_at)}
                          </span>
                          <button
                            onClick={() => handleDeleteNote(n.id)}
                            className="text-xs text-red-500 transition-colors hover:text-red-700 cursor-pointer"
                          >
                            Eliminar
                          </button>
                        </div>
                        <p className="whitespace-pre-wrap text-sm text-slate-800">{n.notes}</p>
                        {Array.isArray(n.treatments_applied) && n.treatments_applied.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {n.treatments_applied.map((key) => (
                              <span key={key} className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                                {treatmentLabel(key)}
                              </span>
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
