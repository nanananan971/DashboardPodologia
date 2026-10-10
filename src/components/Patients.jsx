// src/components/Patients.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function Patients({ session, professionalId, onVerHistorial }) {
  const activeProfessionalId = professionalId || session?.user?.id

  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [formData, setFormData] = useState({
    full_name: '',
    rut: '',
    phone: '',
    email: '',
    medical_history: '',
    allergies: ''
  })
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    if (activeProfessionalId) fetchPatients()
  }, [activeProfessionalId])

  const fetchPatients = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('professional_id', activeProfessionalId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error al cargar pacientes:', error.message)
    } else {
      setPatients(data || [])
    }
    setLoading(false)
  }

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleAddPatient = async (e) => {
    e.preventDefault()
    setMensaje('')

    const newPatient = {
      full_name: formData.full_name,
      professional_id: activeProfessionalId,
    }

    if (formData.rut) newPatient.rut = formData.rut
    if (formData.phone) newPatient.phone = formData.phone
    if (formData.email) newPatient.email = formData.email
    if (formData.medical_history) newPatient.medical_history = formData.medical_history
    if (formData.allergies) newPatient.allergies = formData.allergies

    const { error } = await supabase.from('patients').insert([newPatient])

    if (error) {
      setMensaje('Error al registrar paciente: ' + error.message)
    } else {
      setMensaje('¡Paciente registrado con éxito!')
      setFormData({
        full_name: '',
        rut: '',
        phone: '',
        email: '',
        medical_history: '',
        allergies: ''
      })
      fetchPatients()
      setTimeout(() => setShowForm(false), 900)
    }
  }

  const pacientesFiltrados = patients.filter((p) => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return true
    return (
      p.full_name?.toLowerCase().includes(q) ||
      p.rut?.toLowerCase().includes(q) ||
      p.phone?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="animate-fade-in-up space-y-5">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Gestión de Pacientes</h3>
          <p className="text-sm text-slate-500">Registra y consulta el historial clínico.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="w-full rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-700 cursor-pointer sm:w-auto"
        >
          {showForm ? 'Cerrar formulario' : '+ Nuevo Paciente'}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs sm:p-6">
          <h4 className="mb-4 text-base font-bold text-slate-800">Registrar Nuevo Paciente</h4>

          <form onSubmit={handleAddPatient} className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Nombre Completo *</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                required
                placeholder="Ej. Juan Pérez"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">RUN / Identificación (Opcional)</label>
              <input
                type="text"
                name="rut"
                value={formData.rut}
                onChange={handleInputChange}
                placeholder="Ej. 12.345.678-9"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Teléfono (Opcional)</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+56912345678"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Correo Electrónico (Opcional)</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="correo@ejemplo.com"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-600 focus:bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Historial Médico (Opcional)</label>
              <textarea
                name="medical_history"
                value={formData.medical_history}
                onChange={handleInputChange}
                rows="2"
                placeholder="Antecedentes médicos relevantes..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-600 focus:bg-white"
              ></textarea>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Alergias (Opcional)</label>
              <input
                type="text"
                name="allergies"
                value={formData.allergies}
                onChange={handleInputChange}
                placeholder="Ej. Penicilina"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-600 focus:bg-white"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-sky-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700 cursor-pointer sm:col-span-2"
            >
              Guardar Paciente
            </button>

            {mensaje && (
              <p className={`text-center text-xs font-medium sm:col-span-2 ${mensaje.includes('éxito') ? 'text-emerald-600' : 'text-red-600'}`}>
                {mensaje}
              </p>
            )}
          </form>
        </div>
      )}

      {/* Buscador */}
      <div>
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, RUN o teléfono..."
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-600 sm:max-w-md"
        />
      </div>

      {/* Listado de Pacientes */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs sm:p-6">
        <h4 className="mb-4 text-base font-bold text-slate-800">
          Pacientes Registrados
          <span className="ml-2 text-sm font-normal text-slate-400">({pacientesFiltrados.length})</span>
        </h4>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="skeleton h-24 w-full" />
            <div className="skeleton h-24 w-full" />
          </div>
        ) : pacientesFiltrados.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
            <p className="text-sm text-slate-500">
              {patients.length === 0 ? 'No hay pacientes registrados todavía.' : 'No se encontraron pacientes con esa búsqueda.'}
            </p>
          </div>
        ) : (
          <>
            {/* Vista de tarjetas adaptada a móvil */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
              {pacientesFiltrados.map((patient) => (
                <div key={patient.id} className="animate-fade-in rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <p className="font-bold text-slate-900">{patient.full_name}</p>
                  <div className="mt-2 space-y-1 text-xs text-slate-600">
                    <p><strong className="text-slate-400">RUN:</strong> {patient.rut || 'No especificado'}</p>
                    <p><strong className="text-slate-400">Tel:</strong> {patient.phone || 'No especificado'}</p>
                    <p className="truncate"><strong className="text-slate-400">Correo:</strong> {patient.email || 'No especificado'}</p>
                  </div>
                  <button
                    onClick={() => onVerHistorial?.(patient.id)}
                    className="mt-3.5 w-full rounded-xl border border-sky-200 bg-sky-50 py-2.5 text-xs font-bold text-sky-700 transition-colors hover:bg-sky-100 cursor-pointer"
                  >
                    Ver historial clínico →
                  </button>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-700">
                  <tr>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">RUN</th>
                    <th className="px-4 py-3">Teléfono</th>
                    <th className="px-4 py-3">Correo</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {pacientesFiltrados.map((patient) => (
                    <tr key={patient.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{patient.full_name}</td>
                      <td className="px-4 py-3">{patient.rut || 'No especificado'}</td>
                      <td className="px-4 py-3">{patient.phone || 'No especificado'}</td>
                      <td className="px-4 py-3">{patient.email || 'No especificado'}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => onVerHistorial?.(patient.id)}
                          className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-100 cursor-pointer"
                        >
                          Ver historial
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}