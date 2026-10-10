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
      .select('clinic_name, full_name, requiere_abono, monto_abono, mp_payment_link')
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
    }
    setLoading(false)
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
      ...overrides,
    }

    const { error } = await supabase.from('profiles').upsert(payload)

    if (error) {
      setMensaje('Error al guardar: ' + error.message)
    } else {
      setMensaje('Preferencias guardadas.')
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

      {/* --- Sección: Cobro de Abono para Reservas y Link de Mercado Pago --- */}
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