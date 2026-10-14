// src/components/Configuracion.jsx

import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Profesionales from './Profesionales'

export default function Configuracion({ session, profile, recordatoriosActivos, setRecordatoriosActivos, onProfileSaved }) {
  const [clinicName, setClinicName] = useState('')
  const [professionalName, setProfessionalName] = useState('')
  const [requiereAbono, setRequiereAbono] = useState(false)
  const [montoAbono, setMontoAbono] = useState(5000)
  const [mpPaymentLink, setMpPaymentLink] = useState('')
  
  // --- Configuración del Formulario ---
  const [servicios, setServicios] = useState([])
  const [nuevoServicioNombre, setNuevoServicioNombre] = useState('')
  const [nuevoServicioPrecio, setNuevoServicioPrecio] = useState('')
  
  const [modalidades, setModalidades] = useState({ presencial: true, domicilio: false })
  const [direccionConsulta, setDireccionConsulta] = useState('')
  
  // --- Comunas estructuradas como Array (Tags) ---
  const [comunasCobertura, setComunasCobertura] = useState([])
  const [nuevaComuna, setNuevaComuna] = useState('')

  // --- Instrucciones estructuradas como Array (Listado de ítems) ---
  const [instrucciones, setInstrucciones] = useState([])
  const [nuevaInstruccion, setNuevaInstruccion] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    if (session?.user?.id) fetchProfile()
  }, [session])

  const fetchProfile = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('clinic_name, full_name, requiere_abono, monto_abono, mp_payment_link, servicios, modalidades, direccion_consulta, comunas_cobertura, mensaje_bienvenida')
      .eq('id', session.user.id)
      .maybeSingle()

    if (error) {
      console.error('Error al cargar configuración:', error.message)
    } else if (data) {
      setClinicName(data.clinic_name || '')
      setProfessionalName(data.full_name || '')
      setRequiereAbono(data.requiere_abono || false)
      setMontoAbono(data.monto_abono ?? 5000)
      setMpPaymentLink(data.mp_payment_link || '')

      setServicios(Array.isArray(data.servicios) ? data.servicios : [])
      setModalidades(data.modalidades || { presencial: true, domicilio: false })
      setDireccionConsulta(data.direccion_consulta || '')
      
      setComunasCobertura(Array.isArray(data.comunas_cobertura) ? data.comunas_cobertura : [])
      
      // Cargar instrucciones como Array
      setInstrucciones(Array.isArray(data.mensaje_bienvenida) ? data.mensaje_bienvenida : [])
    }
    setLoading(false)
  }

  // --- Funciones para gestionar servicios ---
  const handleAddServicio = (e) => {
    e.preventDefault()
    if (!nuevoServicioNombre.trim()) return
    if (servicios.length >= 10) {
      alert('Puedes añadir un máximo de 10 servicios.')
      return
    }

    const nuevo = {
      id: Date.now().toString(),
      nombre: nuevoServicioNombre.trim(),
      precio: Number(nuevoServicioPrecio) || 0,
    }

    setServicios([...servicios, nuevo])
    setNuevoServicioNombre('')
    setNuevoServicioPrecio('')
  }

  const handleRemoveServicio = (id) => {
    setServicios(servicios.filter((s) => s.id !== id))
  }

  // --- Funciones para gestionar comunas ---
  const handleAddComuna = (e) => {
    e?.preventDefault()
    const nombreLimpio = nuevaComuna.trim()
    if (!nombreLimpio) return

    if (comunasCobertura.some((c) => c.toLowerCase() === nombreLimpio.toLowerCase())) {
      setNuevaComuna('')
      return
    }

    setComunasCobertura([...comunasCobertura, nombreLimpio])
    setNuevaComuna('')
  }

  const handleRemoveComuna = (comunaAEliminar) => {
    setComunasCobertura(comunasCobertura.filter((c) => c !== comunaAEliminar))
  }

  // --- Funciones para gestionar instrucciones ---
  const handleAddInstruccion = (e) => {
    e?.preventDefault()
    const textoLimpio = nuevaInstruccion.trim()
    if (!textoLimpio) return

    if (instrucciones.length >= 6) {
      alert('Puedes añadir un máximo de 6 instrucciones o recomendaciones.')
      return
    }

    setInstrucciones([...instrucciones, textoLimpio])
    setNuevaInstruccion('')
  }

  const handleRemoveInstruccion = (indexAEliminar) => {
    setInstrucciones(instrucciones.filter((_, idx) => idx !== indexAEliminar))
  }

  const guardar = async (overrides = {}) => {
    setSaving(true)
    setMensaje('')

    const payload = {
      id: session.user.id,
      clinic_name: clinicName.trim() || null,
      full_name: professionalName.trim() || null,
      requiere_abono: requiereAbono,
      monto_abono: Number(montoAbono) || 0,
      mp_payment_link: mpPaymentLink.trim() || null,
      servicios,
      modalidades,
      direccion_consulta: direccionConsulta.trim() || null,
      comunas_cobertura: comunasCobertura,
      mensaje_bienvenida: instrucciones, // Se guarda como JSON array
      ...overrides,
    }

    const { error } = await supabase.from('profiles').upsert(payload)

    if (error) {
      setMensaje('Error al guardar: ' + error.message)
    } else {
      setMensaje('Preferencias guardadas con éxito.')
      onProfileSaved?.()
      setTimeout(() => setMensaje(''), 2500)
    }
    setSaving(false)
  }

  const handleGuardarDatosClinica = (e) => {
    e.preventDefault()
    guardar({})
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="skeleton h-6 w-48" />
        <div className="skeleton h-28 w-full" />
        <div className="skeleton h-24 w-full" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h3 className="text-lg font-semibold text-slate-800">Configuración</h3>
        <p className="text-sm text-slate-500">Ajusta el comportamiento de tu agenda y tus preferencias generales.</p>
      </div>

      {/* --- SECCIÓN: Configura tu Formulario de Reserva --- */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6 space-y-6">
        <div>
          <h4 className="text-base font-medium text-slate-800">Configura tu Formulario de Reserva</h4>
          <p className="text-xs text-slate-500">
            Define la oferta de servicios, modalidades e instrucciones que verán tus pacientes al agendar una hora.
          </p>
        </div>

        {/* 1. Modalidades de atención */}
        <div className="border-t border-slate-100 pt-4">
          <label className="mb-2 block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Modalidad de Atención
          </label>
          <div className="flex flex-wrap gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={modalidades.presencial}
                onChange={(e) => setModalidades({ ...modalidades, presencial: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 accent-sky-600"
              />
              🏥 Atención en Consulta / Presencial
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={modalidades.domicilio}
                onChange={(e) => setModalidades({ ...modalidades, domicilio: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 accent-sky-600"
              />
              🏠 Atención a Domicilio
            </label>
          </div>
        </div>

        {/* 2. Servicios ofrecidos y precios */}
        <div className="border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Servicios Ofrecidos ({servicios.length}/10)
            </label>
          </div>

          <form onSubmit={handleAddServicio} className="grid grid-cols-1 sm:grid-cols-12 gap-2 mb-4">
            <input
              type="text"
              placeholder="Ej. Evaluación podológica o Tratamiento de Onicomicosis"
              value={nuevoServicioNombre}
              onChange={(e) => setNuevoServicioNombre(e.target.value)}
              className="sm:col-span-7 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-sky-600 focus:bg-white"
            />
            <input
              type="number"
              placeholder="Precio CLP (ej. 25000)"
              value={nuevoServicioPrecio}
              onChange={(e) => setNuevoServicioPrecio(e.target.value)}
              className="sm:col-span-3 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-sky-600 focus:bg-white"
            />
            <button
              type="submit"
              disabled={servicios.length >= 10 || !nuevoServicioNombre.trim()}
              className="sm:col-span-2 rounded-md bg-sky-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-sky-700 disabled:opacity-50 cursor-pointer"
            >
              + Añadir
            </button>
          </form>

          {servicios.length > 0 ? (
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50/50">
              {servicios.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="font-medium text-slate-700">{s.nombre}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-900">${s.precio.toLocaleString('es-CL')} CLP</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveServicio(s.id)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium cursor-pointer"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No has añadido servicios aún. Agrega el primero arriba.</p>
          )}
        </div>

        {/* 3. Información Adicional / Dinámica según Modalidad */}
        <div className="border-t border-slate-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
          {/* Input para Dirección */}
          {modalidades.presencial && (
            <div className={!modalidades.domicilio ? 'sm:col-span-2' : ''}>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">Dirección de la Consulta / Centro</label>
              <input
                type="text"
                value={direccionConsulta}
                onChange={(e) => setDireccionConsulta(e.target.value)}
                placeholder="Ej. Av. Providencia 1234, Oficina 502"
                className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-sky-600 focus:bg-white"
              />
            </div>
          )}

          {/* Selector de Comunas con Tags/Chips */}
          {modalidades.domicilio && (
            <div className={!modalidades.presencial ? 'sm:col-span-2' : ''}>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">Comunas de Cobertura a Domicilio</label>

              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={nuevaComuna}
                  onChange={(e) => setNuevaComuna(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddComuna()
                    }
                  }}
                  placeholder="Ej. Ñuñoa, San Bernardo (presiona Enter)"
                  className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-sky-600 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={handleAddComuna}
                  disabled={!nuevaComuna.trim()}
                  className="rounded-md bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-700 disabled:opacity-50 cursor-pointer shrink-0"
                >
                  + Agregar
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 min-h-[38px] p-2 rounded-md border border-slate-200 bg-slate-50/50">
                {comunasCobertura.length > 0 ? (
                  comunasCobertura.map((comuna, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-800 border border-sky-200 animate-fade-in"
                    >
                      📍 {comuna}
                      <button
                        type="button"
                        onClick={() => handleRemoveComuna(comuna)}
                        className="ml-1 text-sky-600 hover:text-red-600 font-bold cursor-pointer"
                        title="Eliminar comuna"
                      >
                        ✕
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic flex items-center">
                    Añade las comunas que atiendes a domicilio arriba.
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Listado de Instrucciones / Indicaciones de Bienvenida */}
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-700">
                Instrucciones / Indicaciones previas para el paciente ({instrucciones.length}/6)
              </label>
            </div>

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={nuevaInstruccion}
                onChange={(e) => setNuevaInstruccion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddInstruccion()
                  }
                }}
                placeholder="Ej. Asistir sin esmalte de uñas o disponer de una silla cómoda"
                className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-sky-600 focus:bg-white"
              />
              <button
                type="button"
                onClick={handleAddInstruccion}
                disabled={!nuevaInstruccion.trim() || instrucciones.length >= 6}
                className="rounded-md bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-700 disabled:opacity-50 cursor-pointer shrink-0"
              >
                + Agregar
              </button>
            </div>

            {/* Tarjetas/Lista de Instrucciones */}
            {instrucciones.length > 0 ? (
              <div className="space-y-2">
                {instrucciones.map((inst, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-700 animate-fade-in"
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="text-sky-600 font-semibold">📝</span>
                      <span className="truncate">{inst}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveInstruccion(index)}
                      className="text-xs font-medium text-red-500 hover:text-red-700 cursor-pointer shrink-0"
                      title="Eliminar instrucción"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                No has añadido instrucciones aún. Escribe una recomendación para el paciente arriba.
              </p>
            )}
          </div>
        </div>

        <div>
          <button
            type="button"
            disabled={saving}
            onClick={() => guardar()}
            className="rounded-md bg-sky-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-700 disabled:opacity-60 cursor-pointer"
          >
            {saving ? 'Guardando...' : 'Guardar configuración del formulario'}
          </button>
        </div>
      </div>

      {/* --- SECCIÓN: Datos de la Clínica --- */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <h4 className="mb-4 text-base font-medium text-slate-800">Datos de la Clínica</h4>
        <p className="mb-4 text-xs text-slate-500">
          Estos datos aparecen en los recordatorios por WhatsApp y en la ficha clínica descargable de tus pacientes.
        </p>

        <form onSubmit={handleGuardarDatosClinica} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">Nombre de la Clínica</label>
            <input
              type="text"
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              placeholder="Ej. Centro Podológico Ñuñoa"
              className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none transition-colors focus:border-sky-600 focus:bg-white"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">Nombre del Podólogo Atendiente</label>
            <input
              type="text"
              value={professionalName}
              onChange={(e) => setProfessionalName(e.target.value)}
              placeholder="Ej. Dra. Camila Rojas"
              className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none transition-colors focus:border-sky-600 focus:bg-white"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-sky-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-700 disabled:opacity-60 cursor-pointer"
            >
              {saving ? 'Guardando...' : 'Guardar datos de la clínica'}
            </button>
          </div>
        </form>
      </div>

      {/* --- SECCIÓN: Cobro de Abono para Reservas --- */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <h4 className="mb-2 text-base font-medium text-slate-800">Cobro de Abono para Reservas</h4>
        <p className="mb-4 text-xs text-slate-500">
          Configura si deseas solicitar un abono previo mediante un enlace de pago de Mercado Pago.
        </p>

        <div className="space-y-4">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={requiereAbono}
              onChange={(e) => setRequiereAbono(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-sky-600"
            />
            <span className="text-sm font-medium text-slate-700">Cobrar abono para confirmar reserva</span>
          </label>

          {requiereAbono && (
            <div className="space-y-3 rounded-lg border border-slate-100 bg-slate-50 p-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">Monto del abono (CLP)</label>
                <input
                  type="number"
                  value={montoAbono}
                  onChange={(e) => setMontoAbono(e.target.value)}
                  placeholder="Ej. 5000"
                  className="w-full max-w-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-600"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">Tu Link de Pago de Mercado Pago (URL)</label>
                <input
                  type="url"
                  value={mpPaymentLink}
                  onChange={(e) => setMpPaymentLink(e.target.value)}
                  placeholder="Ej. https://mpago.la/12345abc o https://link.mercadopago.cl/tuusuario"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-600"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  💡 Puedes crear un link de cobro fijo desde tu aplicación de Mercado Pago por el monto del abono y pegarlo aquí.
                </p>
              </div>
            </div>
          )}

          <div>
            <button
              type="button"
              disabled={saving}
              onClick={() => guardar()}
              className="rounded-md bg-sky-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-700 disabled:opacity-60 cursor-pointer"
            >
              {saving ? 'Guardando...' : 'Guardar configuración de abono'}
            </button>
          </div>
        </div>
      </div>

      {saving && <p className="text-xs text-slate-400">Guardando...</p>}
      {mensaje && <p className="animate-fade-in text-xs font-medium text-emerald-600">{mensaje}</p>}

      {/* --- SECCIÓN: Profesionales --- */}
      <div className="border-t border-slate-200 pt-6">
        <h4 className="mb-1 text-base font-medium text-slate-800">Profesionales</h4>
        <p className="mb-4 text-sm text-slate-500">
          {profile?.role === 'owner'
            ? 'Gestiona quién más de tu clínica tiene acceso a esta cuenta.'
            : 'Estas son las personas con acceso a tu clínica.'}
        </p>
        {profile ? (
          <Profesionales profile={profile} />
        ) : (
          <p className="text-sm text-slate-400">Cargando información de la cuenta...</p>
        )}
      </div>
    </div>
  )
}