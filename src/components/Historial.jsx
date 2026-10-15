// src/components/Historial.jsx

import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { CONDITION_GROUPS } from '../lib/conditions'
import { TREATMENT_GROUPS, PROGRESS_LEVELS } from '../lib/treatments'
import { imprimirFichaPaciente } from '../lib/pdfFicha'
import InformePacienteModal from './InformePacienteModal'

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
  const [nuevaNotaProgreso, setNuevaNotaProgreso] = useState('en_progreso')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  // --- Ficha clínica: patologías y tratamientos ---
  const [conditions, setConditions] = useState([])
  const [conditionsNotes, setConditionsNotes] = useState('')
  const [treatments, setTreatments] = useState([])
  const [treatmentNotes, setTreatmentNotes] = useState('')
  const [savingFicha, setSavingFicha] = useState(false)
  const [fichaDirty, setFichaDirty] = useState(false)
  const [fichaMensaje, setFichaMensaje] = useState('')

  // --- Modal de Informe para Paciente ---
  const [showInformePacienteModal, setShowInformePacienteModal] = useState(false)

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
        'id, full_name, rut, phone, email, medical_history, allergies, conditions, conditions_notes, treatment_recommendations, treatment_notes'
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
    setNuevaNotaProgreso('en_progreso')

    const paciente = patients.find((p) => p.id === id)
    setConditions(Array.isArray(paciente?.conditions) ? paciente.conditions : [])
    setConditionsNotes(paciente?.conditions_notes || '')
    setTreatments(Array.isArray(paciente?.treatment_recommendations) ? paciente.treatment_recommendations : [])
    setTreatmentNotes(paciente?.treatment_notes || '')
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
      })
      .eq('id', selectedPatientId)

    if (error) {
      setFichaMensaje('Error al guardar la ficha: ' + error.message)
    } else {
      setFichaMensaje('¡Ficha clínica actualizada con éxito!')
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
              }
            : p
        )
      )
      setTimeout(() => setFichaMensaje(''), 2500)
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
      progress_level: nuevaNotaProgreso,
    }])

    if (error) {
      setMensaje('Error al guardar la nota: ' + error.message)
    } else {
      setNuevaNota('')
      setNuevaNotaTratamientos([])
      setNuevaNotaProgreso('en_progreso')
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

  const progressLabel = (val) =>
    PROGRESS_LEVELS.find((p) => p.value === val)?.label || val

  return (
    <div className="animate-fade-in-up space-y-4 sm:space-y-6">
      <div className="border-b border-slate-200 pb-3 sm:pb-5">
        <h3 className="text-base sm:text-lg font-bold text-slate-800">Historial Clínico Podológico</h3>
        <p className="text-xs sm:text-sm text-slate-500">Ficha clínica, recomendaciones y registro cronológico de sesiones.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        {/* Selector de pacientes */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-xs lg:col-span-1">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o RUN..."
            className="mb-3 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-all focus:border-sky-600 focus:bg-white"
          />

          {loadingPatients ? (
            <div className="space-y-2 py-2">
              <div className="skeleton h-10 w-full rounded-xl" />
              <div className="skeleton h-10 w-full rounded-xl" />
            </div>
          ) : pacientesFiltrados.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">No hay pacientes que coincidan.</p>
          ) : (
            <div className="max-h-[220px] sm:max-h-[460px] space-y-1.5 overflow-y-auto pr-1">
              {pacientesFiltrados.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPatient(p.id)}
                  className={`w-full rounded-xl px-3 py-2.5 sm:px-3.5 sm:py-3 text-left text-xs transition-all cursor-pointer flex items-center justify-between ${
                    selectedPatientId === p.id 
                      ? 'bg-sky-50 font-bold text-sky-800 border border-sky-200 shadow-2xs' 
                      : 'text-slate-700 hover:bg-slate-50 border border-transparent font-medium'
                  }`}
                >
                  <span className="truncate pr-2">{p.full_name}</span>
                  {Array.isArray(p.conditions) && p.conditions.length > 0 && (
                    <span className="shrink-0 rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                      {p.conditions.length} pat.
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Ficha e Historial del paciente seleccionado */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-5">
          {!pacienteActivo ? (
            <div className="flex h-full min-h-[200px] sm:min-h-[350px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-6 sm:p-8 text-center shadow-2xs">
              <p className="text-xs font-semibold text-slate-500">Selecciona un paciente para ver o editar su ficha clínica.</p>
            </div>
          ) : (
            <div key={selectedPatientId} className="animate-fade-in space-y-4 sm:space-y-5">
              {/* Tarjeta de Información del Paciente */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <h4 className="text-base font-extrabold text-slate-900">{pacienteActivo.full_name}</h4>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-slate-500">
                      {pacienteActivo.rut && <span>RUN: {pacienteActivo.rut}</span>}
                      {pacienteActivo.phone && <span>Tel: {pacienteActivo.phone}</span>}
                      {pacienteActivo.email && <span>{pacienteActivo.email}</span>}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0">
                    <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">
                      {totalSesiones} sesión{totalSesiones !== 1 ? 'es' : ''}
                    </span>
                    <button
                      onClick={() => imprimirFichaPaciente(pacienteActivo, notes, profile)}
                      className="flex-1 sm:flex-none text-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer shadow-2xs"
                    >
                      🖨️ Ficha Interna
                    </button>
                    <button
                      onClick={() => setShowInformePacienteModal(true)}
                      className="flex-1 sm:flex-none text-center rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-sky-700 cursor-pointer shadow-2xs"
                    >
                      📋 Informe Paciente
                    </button>
                  </div>
                </div>

                {(pacienteActivo.allergies || pacienteActivo.medical_history) && (
                  <div className="grid grid-cols-1 gap-2 pt-2 border-t border-slate-100 text-xs">
                    {pacienteActivo.allergies && (
                      <p className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 font-medium text-amber-900">
                        <strong>⚠️ Alergias:</strong> {pacienteActivo.allergies}
                      </p>
                    )}
                    {pacienteActivo.medical_history && (
                      <p className="rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-2 text-slate-700">
                        <strong>Antecedentes médicos:</strong> {pacienteActivo.medical_history}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* FICHA CLÍNICA — PATOLOGÍAS PODOLÓGICAS */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h5 className="text-xs sm:text-sm font-extrabold text-slate-800">Ficha clínica — Patologías podológicas</h5>
                    <p className="text-[11px] text-slate-400">Condiciones de base del paciente.</p>
                  </div>
                  {fichaDirty && (
                    <button
                      onClick={handleGuardarFicha}
                      disabled={savingFicha}
                      className="w-full sm:w-auto rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-60 cursor-pointer animate-pulse"
                    >
                      {savingFicha ? 'Guardando...' : '💾 Guardar Ficha'}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
                  {CONDITION_GROUPS.map((group) => (
                    <div key={group.group} className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
                      <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-sky-900">{group.group}</p>
                      <div className="space-y-1.5">
                        {group.items.map((item) => {
                          const isChecked = conditions.includes(item.key)
                          return (
                            <label
                              key={item.key}
                              className={`flex cursor-pointer items-center gap-2 rounded-lg p-2 text-xs font-medium transition-all ${
                                isChecked
                                  ? 'bg-sky-100/70 border border-sky-300 text-sky-950 font-bold shadow-2xs'
                                  : 'bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-100/50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleCondition(item.key)}
                                className="h-4 w-4 shrink-0 accent-sky-600 rounded-md cursor-pointer"
                              />
                              <span className="flex-1 leading-snug">{item.label}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">Otras patologías / observaciones detalladas</label>
                  <textarea
                    value={conditionsNotes}
                    onChange={(e) => { setConditionsNotes(e.target.value); setFichaDirty(true) }}
                    rows="2"
                    placeholder="Ej. Antecedente de cirugía en dedo gordo pie derecho..."
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 sm:p-3 text-xs font-semibold text-slate-800 outline-none transition focus:border-sky-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* Tratamientos / medicamentos recomendados */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-4">
                <h5 className="text-xs sm:text-sm font-extrabold text-slate-800">Recomendaciones de tratamiento / medicamentos tópicos</h5>
                <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
                  {TREATMENT_GROUPS.map((group) => (
                    <div key={group.group} className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
                      <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-emerald-900">{group.group}</p>
                      <div className="space-y-1.5">
                        {group.items.map((item) => {
                          const isChecked = treatments.includes(item.key)
                          return (
                            <label
                              key={item.key}
                              className={`flex cursor-pointer items-center gap-2 rounded-lg p-2 text-xs font-medium transition-all ${
                                isChecked
                                  ? 'bg-emerald-100/70 border border-emerald-300 text-emerald-950 font-bold shadow-2xs'
                                  : 'bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-100/50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleTreatment(item.key)}
                                className="h-4 w-4 shrink-0 accent-emerald-600 rounded-md cursor-pointer"
                              />
                              <span className="flex-1 leading-snug">{item.label}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">Indicaciones de tratamiento (posología, frecuencia, etc.)</label>
                  <textarea
                    value={treatmentNotes}
                    onChange={(e) => { setTreatmentNotes(e.target.value); setFichaDirty(true) }}
                    rows="2"
                    placeholder="Ej. Aplicar crema con urea 30% en talones cada noche..."
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 sm:p-3 text-xs font-semibold text-slate-800 outline-none transition focus:border-sky-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* REGISTRO CRONOLÓGICO */}
              <form onSubmit={handleAddNote} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h5 className="text-xs sm:text-sm font-extrabold text-slate-800">Nueva entrada de sesión</h5>
                    <p className="text-[11px] text-slate-400">Registra el procedimiento y evolución actual.</p>
                  </div>
                  <div className="w-full sm:w-44">
                    <select
                      value={nuevaNotaProgreso}
                      onChange={(e) => setNuevaNotaProgreso(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2 text-xs font-bold text-slate-700 outline-none focus:border-sky-600 cursor-pointer"
                    >
                      {PROGRESS_LEVELS.map((o) => (
                        <option key={o.value} value={o.value}>Estado: {o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <textarea
                  value={nuevaNota}
                  onChange={(e) => setNuevaNota(e.target.value)}
                  rows="3"
                  placeholder="Ej: Se realiza asepsia, antisepsia y deslaminación de hiperqueratosis plantar..."
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 sm:p-3 text-xs font-semibold text-slate-800 outline-none transition focus:border-sky-600 focus:bg-white"
                />

                <div>
                  <p className="mb-2 text-xs font-bold text-slate-700">Tratamientos aplicados en esta sesión</p>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {TREATMENT_GROUPS.flatMap((g) => g.items).map((item) => (
                      <label
                        key={item.key}
                        className={`cursor-pointer rounded-xl border px-2.5 py-1 text-xs font-semibold transition-all ${
                          nuevaNotaTratamientos.includes(item.key)
                            ? 'border-emerald-300 bg-emerald-100 text-emerald-900 shadow-2xs'
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

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  {mensaje && <p className="text-xs text-red-600 font-semibold w-full sm:w-auto text-center sm:text-left">{mensaje}</p>}
                  <button
                    type="submit"
                    disabled={guardando || !nuevaNota.trim()}
                    className="w-full sm:w-auto sm:ml-auto rounded-xl bg-sky-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50 cursor-pointer"
                  >
                    {guardando ? 'Guardando...' : '+ Guardar Entrada'}
                  </button>
                </div>
              </form>

              {/* Historial Cronológico */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-4">
                <h5 className="text-xs sm:text-sm font-extrabold text-slate-800">Historial cronológico de atenciones</h5>
                {loadingNotes ? (
                  <div className="space-y-2">
                    <div className="skeleton h-16 w-full rounded-xl" />
                  </div>
                ) : notes.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
                    <p className="text-xs font-medium text-slate-500">No hay entradas registradas aún.</p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {notes.map((n) => (
                      <li key={n.id} className="animate-fade-in rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-sky-900">
                              {n.session_number ? `Sesión #${n.session_number} · ` : ''}{formatFecha(n.created_at)}
                            </span>
                            {n.progress_level && (
                              <span className="rounded-lg bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800">
                                {progressLabel(n.progress_level)}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteNote(n.id)}
                            className="text-xs font-bold text-red-500 hover:text-red-700 cursor-pointer"
                          >
                            Eliminar
                          </button>
                        </div>
                        <p className="whitespace-pre-wrap text-xs text-slate-800 leading-relaxed">{n.notes}</p>
                        {Array.isArray(n.treatments_applied) && n.treatments_applied.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {n.treatments_applied.map((key) => (
                              <span key={key} className="rounded-lg bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
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

      {/* Modal de Informe para el Paciente */}
      {showInformePacienteModal && pacienteActivo && (
        <InformePacienteModal
          paciente={pacienteActivo}
          profile={profile}
          onClose={() => setShowInformePacienteModal(false)}
        />
      )}
    </div>
  )
}